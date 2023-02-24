FROM python:3.9-alpine

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apk --update --no-cache add make cmake automake gfortran gcc g++ subversion openblas-dev python3-dev linux-headers libffi-dev mysql-client mariadb-connector-c-dev nodejs npm py3-numpy py3-pandas py3-scipy py3-typing-extensions py3-django py3-autobahn py3-asgiref py3-mysqlclient py3-oauthlib py3-django-crispy-forms py3-passlib py3-requests py3-requests-oauthlib py3-tqdm py3-scikit-learn py3-setuptools py3-wheel cython

WORKDIR /
COPY ./adviser/requirements.txt /django_code/requirements.txt
RUN echo $(ls -a)
WORKDIR /django_code
RUN echo $(ls -a)/
RUN pip install -U torch>=1.10 torchvision --extra-index-url https://download.pytorch.org/whl/cpu
RUN pip install -v -U -r ./requirements.txt

COPY ./adviser /django_code
RUN echo $(ls -a)
RUN cd /django_code/apps/diagraph/dialog_designer_ui && \
    npm install && \
    npm run build

RUN cp /django_code/resolveDjangoUrls.py /django_code/apps/diagraph/dialog_designer_ui/build/
RUN cd /django_code/apps/diagraph/dialog_designer_ui/build/ && python ./resolveDjangoUrls.py
RUN cp /django_code/apps/diagraph/dialog_designer_ui/build/index.html /django_code/apps/diagraph/dialog_designer_server/management/templates/data/editor_index.html

RUN cd /django_code/apps/diagraph/chat_ui && \
    npm install && \
    npm run build
RUN cp /django_code/resolveDjangoUrls.py /django_code/apps/diagraph/chat_ui/build/
RUN cd /django_code/apps/diagraph/chat_ui/build/ && python ./resolveDjangoUrls.py
RUN cp /django_code/apps/diagraph/chat_ui/build/index.html /django_code/apps/diagraph/data/templates/chat/index.html


