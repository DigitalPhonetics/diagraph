import traceback
from uuid import uuid4
import json
from django.core.management.base import BaseCommand, CommandError
from data.dialogGraph import DialogGraph
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = "Imports (and overwrites) the default graph that will be displayed in every user's dashbaord"

    def add_arguments(self, parser):
        parser.add_argument('file', type=str, help="Path to Graph JSON file to be imported")

    def handle(self, *args, **options):
        try:
            self.stdout.write(self.style.NOTICE(f"Trying to open file {options['file']}... "), ending='')
            with open(options['file'], "r") as f:
                data = json.load(f)
                self.stdout.write(self.style.NOTICE("SUCCESS"))
                self.stdout.write(self.style.NOTICE("Beginning parse..."))

                # verify that we have a "tutorial" user we can copy from
                if not User.objects.filter(username="_TUTORIAL_").exists():
                    self.stdout.write(self.style.NOTICE("Tutorial user does not exist - creating... "), ending='')
                    User.objects.create(username="_TUTORIAL_", password=str(uuid4())).save()
                    self.stdout.write(self.style.SUCCESS("SUCCESS"))
                tutorialUser = User.objects.get(username="_TUTORIAL_")

                # delete existing tutorial graphs
                self.stdout.write(self.style.NOTICE(f"Deleting existing tutorial graphs..."))
                counter = 0
                oldGraph = tutorialUser.graphs.get(name="Tutorial")
                oldGraph.delete()
                # for graph in DialogGraph.objects.filter(name="Tutorial"):
                #     graph.delete()
                #     counter += 1
                # self.stdout.write(self.style.SUCCESS(f"Deleted {counter} existing tutorial graphs"))

                # load new graph
                self.stdout.write(self.style.NOTICE(f"Parsing new tutorial graphs..."))
                graph = DialogGraph.fromJSON(graph_name="Tutorial", owner=tutorialUser, data=data)
                self.stdout.write(self.style.SUCCESS(f"Graph loaded with {graph.nodes.count()} nodes"))

                # copy graph to all existing users
                # self.stdout.write(self.style.NOTICE(f"Copying new tutorial graph to existing users..."))
                # counter = 0
                # for user in User.objects.all():
                #     if user.pk != tutorialUser.pk: # don't copy graph to tutorial user - already has it from loading!
                #         graph.copyToUser(user)
                #         counter += 1
                # self.stdout.write(self.style.SUCCESS(f"Graph copied to {counter} users"))

                self.stdout.write(self.style.SUCCESS("Successfully imported graph"))
        except:
            import os
            self.stdout.write("")
            self.stdout.write(self.style.ERROR(f"Could not parse file {options['file']}"))
            self.stdout.write(self.style.ERROR(f"Current Directory: {os.path.abspath(os.path.curdir)}"))
            self.stderr.write(traceback.format_exc())
