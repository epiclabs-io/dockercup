#!/bin/bash

if [[ "$1" == "--silent" ]]; then
        FLAGS=""
        shift
else
        FLAGS="-it"
fi

docker run -it --rm -v /:/host -v /var/run/docker.sock:/docker.sock epiclabs10/dockercup $1