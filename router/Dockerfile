FROM crossbario/crossbar


USER root
RUN apt update && apt install inetutils-ping -y
COPY ./.crossbar/config.json /node/.crossbar/config.json
RUN chown -R crossbar:crossbar /node

ENTRYPOINT ["crossbar", "start", "--cbdir", "/node/.crossbar"]