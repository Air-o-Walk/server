<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Destinatario
$to  = 'mmalgbon@upv.edu.es';

// Asunto y mensaje
$subject = 'Prueba desde PHP en Plesk';
$message = "Hola,\n\nEste es un correo de prueba enviado desde PHP en Plesk.\n\nSaludos.";

// Cabeceras: remitente soporte@api.sagucre.upv.edu.es
$headers  = "From: soporte@api.sagucre.upv.edu.es\r\n";
$headers .= "Reply-To: soporte@api.sagucre.upv.edu.es\r\n";
$headers .= "X-Mailer: PHP/" . phpversion();

// Enviar
if (mail($to, $subject, $message, $headers)) {
    echo "mail() devolvió TRUE (el servidor aceptó el mensaje).";
} else {
    echo "mail() devolvió FALSE (el servidor NO aceptó el mensaje).";
}
