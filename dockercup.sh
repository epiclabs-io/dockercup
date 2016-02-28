#!/bin/bash
docker run -it --rm -v /:/host -v /var/run/docker.sock:/docker.sock dockercup $1