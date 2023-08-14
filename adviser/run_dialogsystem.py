###############################################################################
#
# Copyright 2020, University of Stuttgart: Institute for Natural Language Processing (IMS)
#
# This file is part of Adviser.
# Adviser is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3.
#
# Adviser is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with Adviser.  If not, see <https://www.gnu.org/licenses/>.
#
###############################################################################

"""
This module allows to chat with the dialog system.
"""

import argparse
import os

from services.domain_tracker.domain_tracker import DomainTracker
from utils.logger import DiasysLogger, LogLevel
from services.dialogsystem import DialogSystem

ROUTER_HOST = "router"
ROUTER_PORT = 8083

def load_console():
    from services.hci.console import ConsoleInput, ConsoleOutput
    user_in = ConsoleInput(domain="", transports=f"ws://{ROUTER_HOST}:{ROUTER_PORT}/ws")
    user_out = ConsoleOutput(domain="", transports=f"ws://{ROUTER_HOST}:{ROUTER_PORT}/ws")
    return [user_in, user_out]


def _init_django():
    import os
    os.environ["DJANGO_ALLOW_ASYNC_UNSAFE"] = "true"
    
    import django
    from django.conf import settings

    if settings.configured:
        return

    print("Configure Django...")
    settings.configure(
        INSTALLED_APPS=[
            'django.contrib.auth',
            'django.contrib.contenttypes',
            'apps.diagraph.data.apps',
        ],
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.postgresql_psycopg2', 
                'NAME': 'adviser',
                'USER': os.environ.get('POSTGRES_USER'),
                'PASSWORD': os.environ.get('POSTGRES_PASSWORD'),
                'HOST': 'db',   # Or an IP Address that your DB is hosted on
                'PORT': '5432',
            }
        },
        DEBUG=True,
        LOGGING = {
            'version': 1,
            'formatters': {
                'verbose': {
                    'format': '%(levelname)s %(asctime)s %(module)s %(process)d %(thread)d %(message)s'
                },
                'simple': {
                    'format': '%(levelname)s %(message)s'
                },
            },
            'disable_existing_loggers': False,
            'filters': {
                'require_debug_false': {
                    '()': 'django.utils.log.RequireDebugFalse'
                }
            },
            'handlers': {
                'chatlogfile': {
                    # 'level': 'DEBUG',
                    # 'class': 'logging.StreamHandler'
                    'class': 'logging.FileHandler',
                    'filename': 'apps/diagraph/dialog_designer_server/logs/chat.txt'
                }
            },
            'loggers': {
                'chat': {
                    'handlers': ['chatlogfile'],
                    'level': "DEBUG",
                    'propagate': True
                }
            }
        }
    )
    print("Setup Django...")
    django.setup()
    print("Done")
    # from django.core.management import execute_from_command_line
    # import sys
    # execute_from_command_line(sys.argv)

def load_tree_policy():
    _init_django()

    from apps.diagraph.similarityMatchingNLU import SimilarityMatchingNLU, SentenceEmbeddings
    from apps.diagraph.dialogTreePolicy import DialogTreePolicy
    from apps.diagraph.domain import TreeDomain
    from apps.diagraph.dialogdesigner import DialogDesigner


    domain = TreeDomain("tree")
    embeddings = SentenceEmbeddings(device='cpu') # TODO make embedding name configurable via UI / console
    designer = DialogDesigner(transports=f"ws://{ROUTER_HOST}:{ROUTER_PORT}/ws")
    nlu = SimilarityMatchingNLU(embeddings=embeddings, domain=domain, transports=f"ws://{ROUTER_HOST}:{ROUTER_PORT}/ws")
    policy = DialogTreePolicy(domain=domain, transports=f"ws://{ROUTER_HOST}:{ROUTER_PORT}/ws")

    return domain, [nlu, policy, designer]


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='ADVISER 2.0 Dialog System')
    parser.add_argument('domains', nargs='+', choices=["tree"],
                        help="Chat domain(s). For multidomain type as list: domain1 domain2 .. \n",
                        default="tree")
    parser.add_argument("--noconsole", action='store_true', help="disable console in-/output")
    parser.add_argument('--asr', action='store_true', help="enable speech input")
    parser.add_argument('--tts', action='store_true', help="enable speech output")
    parser.add_argument('--bc', action='store_true', help="enable backchanneling (doesn't work with 'weather' domain")
    parser.add_argument('--debug', action='store_true', help="enable debug mode")
    parser.add_argument('--log_file', choices=['dialogs', 'results', 'info', 'errors', 'none'], default="none",
                        help="specify file log level")
    parser.add_argument('--log', choices=['dialogs', 'results', 'info', 'errors', 'none'], default="results",
                        help="specify console log level")
    parser.add_argument('--cuda', action='store_true', help="enable cuda (currently only for asr/tts)")
    parser.add_argument('--privacy', action='store_true',
                        help="enable random mutations of the recorded voice to mask speaker identity", default=False)
    # TODO option for remote services
    # TODO option for video
    # TODO option for multiple consecutive dialogs 
    args = parser.parse_args()
    if args.bc and not args.asr:
        parser.error("--bc: Backchannel requires ASR (--asr) option")

    num_dialogs = 100
    domains = []
    services = []

    # setup logger
    file_log_lvl = LogLevel[args.log_file.upper()]
    log_lvl = LogLevel[args.log.upper()]
    conversation_log_dir = './conversation_logs'
    speech_log_dir = None
    if file_log_lvl == LogLevel.DIALOGS:
        # log user audio, system audio and complete conversation
        import time
        from math import floor

        print("This Adviser call will log all your interactions to files.\n")
        if not os.path.exists(f"./{conversation_log_dir}"):
            os.mkdir(f"./{conversation_log_dir}/")
        conversation_log_dir = "./" + conversation_log_dir + "/{}/".format(floor(time.time()))
        os.mkdir(conversation_log_dir)
        speech_log_dir = conversation_log_dir
    logger = DiasysLogger(file_log_lvl=file_log_lvl,
                          console_log_lvl=log_lvl,
                          logfile_folder=conversation_log_dir,
                          logfile_basename="full_log")

    # load domain specific services
    if 'tree' in args.domains:
        t_domain, t_services = load_tree_policy()
        domains.append(t_domain)
        services.extend(t_services)

    # load text input
    if not args.noconsole:
        services.extend(load_console())

    # services.append(DialogDesigner())

    # setup dialog system
    services.append(DomainTracker(domains=domains, transports=f"ws://{ROUTER_HOST}:{ROUTER_PORT}/ws"))
    debug_logger = logger if args.debug else None

    ds = DialogSystem(services=services, transports=f"ws://{ROUTER_HOST}:{ROUTER_PORT}/ws")
    if args.noconsole: 
        # start message will be triggered from browser, once connected
        ds.run(start_messages={})
    else:
        ds.run(start_messages={"gen_user_utterance": ""})
    # ds.run(start_messages={ControlChannelMessages.DIALOG_END: False})
   