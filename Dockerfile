FROM debian

EXPOSE 8086

RUN apt update && apt install libgtk-3-bin libgtk-3-dev libasound2 flex bison xa65 curl alsa-utils alsa-tools build-essential haproxy nodejs npm -y
#RUN curl -sL https://deb.nodesource.com/setup_10.x | bash -
#RUN apt install nodejs -y

#COPY SDL2_image-2.8.2.tar.gz /tmp
#COPY SDL2-2.30.3.tar.gz /tmp
COPY vice-3.4 /tmp/vice-3.4
WORKDIR /tmp/vice-3.4
ENV LDFLAGS="-Wl,--allow-multiple-definition"
RUN ./configure --enable-native-gtk3ui --disable-lame --without-alsa --without-pulse --without-oss --without-alsa --disable-hwscale && make && make install

#WORKDIR /tmp
#RUN tar xzvf /tmp/SDL2_image-2.8.2.tar.gz
#RUN tar xzvf /tmp/SDL2-2.30.3.tar.gz
#WORKDIR /tmp/SDL2-2.30.3
#RUN ./configure && make && make install
#WORKDIR /tmp/SDL2_image-2.8.2
#RUN ./configure && make && make install

COPY server /opt/server
WORKDIR /opt/server
RUN npm install

COPY startup.sh /tmp
COPY proxy.cfg /tmp
COPY demo.d64 /tmp

#ENV GDK_BACKEND broadway
#ENV BROADWAY_DISPLAY :5

#CMD /tmp/startup.sh
