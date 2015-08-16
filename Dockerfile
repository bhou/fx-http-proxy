FROM ubuntu:14.04

ENV VERSION	0.0.1

########################################
# Basic OS environment
########################################
# update package
RUN apt-get -y update && apt-get -y install \ 
  wget  \
  curl  \
  build-essential \
  python 


########################################
# Node environment
########################################
# install node 10 
RUN curl -sL https://deb.nodesource.com/setup_0.10 | sudo -E bash - \
  && apt-get install -y nodejs  \
  && npm install -g forever

########################################
# Init application environment
########################################
# Bundle app source
RUN mkdir /home/app

COPY . /home/app

WORKDIR /home/app

RUN npm install


########################################
# RUNTIME
########################################
ENV PYTHON /usr/bin/python

WORKDIR /home/app

CMD node proxy.js
EXPOSE  80



