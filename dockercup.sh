#!/bin/bash
docker run -it --rm -v /:/host -v /var/run/docker.sock:/docker.sock epiclabs10/dockercup $1