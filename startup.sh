#!/bin/sh

nohup broadwayd :5 &
node /opt/server/index.js &
GDK_BACKEND=broadway BROADWAY_DISPLAY=:5 x64 -sound -soundarg hw:0,0,0
