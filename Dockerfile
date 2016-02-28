FROM node
MAINTAINER Epic Labs - Javier Peletier jm@epiclabs.io
RUN apt-get update -qq \
	&& apt-get install -y p7zip-full lftp \
	&& apt-get clean autoclean \
	&& apt-get autoremove --yes \
	&& rm -rf /var/lib/{apt,dpkg,cache,log}/

ADD src /dockercup
WORKDIR /dockercup
RUN npm install

ENTRYPOINT ["node", "/dockercup/dockercup.js"]
