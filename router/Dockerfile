FROM crossbario/crossbar

USER root
COPY ./.crossbar /router
RUN chown -R crossbar:crossbar /router

ENTRYPOINT ["crossbar", "start", "--cbdir", "/router/.crossbar"]