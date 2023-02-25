FROM crossbario/crossbar

USER root
COPY ./.crossbar/config.json /node/.crossbar/config.json
RUN chown -R crossbar:crossbar /node

ENTRYPOINT ["crossbar", "start", "--cbdir", "/node/.crossbar"]