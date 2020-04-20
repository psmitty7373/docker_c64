#!/bin/sh

haproxy -f /tmp/proxy.cfg
nohup broadwayd :5 &
cd /opt/server
node /opt/server/index.js &
GDK_BACKEND=broadway BROADWAY_DISPLAY=:5 x64 -sound -soundarg hw:0,0,0
