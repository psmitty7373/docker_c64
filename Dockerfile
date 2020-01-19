FROM ubuntu

EXPOSE 8086

RUN apt update && apt install libgtk-3-bin libasound2 libpcap0.8 curl alsa-utils alsa-tools haproxy -y
RUN curl -sL https://deb.nodesource.com/setup_10.x | bash -
RUN apt install nodejs -y

COPY vice.tar.gz /tmp
COPY server.tar.gz /tmp
COPY startup.sh /tmp
COPY proxy.cfg /tmp
COPY demo.d64 /tmp

RUN cd /tmp
RUN tar xzvf /tmp/vice.tar.gz -C /

ENV GDK_BACKEND broadway
ENV BROADWAY_DISPLAY :5

CMD /tmp/startup.sh
