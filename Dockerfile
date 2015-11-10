FROM docker.vsp.com/vspglobal/node

# NPM dependencies
ENV NODE_ENV production
ADD package.json /tmp/package.json
RUN cd /tmp && npm install
RUN mkdir -p /opt/app
RUN cp -a /tmp/node_modules /opt/app/

## Add the App
WORKDIR /opt/app
ADD dist .


EXPOSE 8080
CMD ["node","."]
#ENTRYPOINT ["node","."]
