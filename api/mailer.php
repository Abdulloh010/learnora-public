<?php
/* ─────────────────────────────────────────────────────────────
   Learnora — SMTP Mailer
   Uses stream_socket_client (SSL) with fallback to PHP mail().
   ───────────────────────────────────────────────────────────── */

define('SMTP_HOST', cfg('SMTP_HOST', 'mail.learnora.uz'));
define('SMTP_PORT', (int) cfg('SMTP_PORT', '465'));   // 465 = implicit SSL/TLS
define('SMTP_USER', cfg('SMTP_USER', 'support@learnora.uz'));
define('SMTP_PASS', cfg('SMTP_PASS'));
define('SMTP_FROM', cfg('SMTP_FROM', 'support@learnora.uz'));
define('SMTP_NAME', cfg('SMTP_NAME', 'Learnora'));

/**
 * Send an email. Returns true on success, false on failure.
 */
function sendMail(?string $toEmail, ?string $toName, string $subject, string $htmlBody): bool {
    // Social-login accounts may have no email; nothing to send
    $toEmail = trim((string)$toEmail);
    $toName  = trim((string)$toName);
    if ($toEmail === '') return false;
    $ok = sendMailSmtp($toEmail, $toName, $subject, $htmlBody);
    if (!$ok) {
        // Fallback: try PHP built-in mail() in case SMTP sockets are blocked
        $ok = sendMailFallback($toEmail, $toName, $subject, $htmlBody);
    }
    return $ok;
}

function sendMailSmtp(string $toEmail, string $toName, string $subject, string $htmlBody): bool {
    $host    = SMTP_HOST;
    $port    = SMTP_PORT;
    $user    = SMTP_USER;
    $pass    = SMTP_PASS;
    $from    = SMTP_FROM;
    $timeout = 20;
    $ssl     = ($port === 465);

    // SSL context — disable peer verification for shared hosting self-signed certs
    $ctx = stream_context_create([
        'ssl' => [
            'verify_peer'       => false,
            'verify_peer_name'  => false,
            'allow_self_signed' => true,
        ],
    ]);

    // Build connection address (host only — port is the separate parameter)
    $addr = ($ssl ? 'ssl://' : 'tcp://') . $host;

    $sock = @stream_socket_client(
        $addr . ':' . $port,
        $errno, $errstr, $timeout,
        STREAM_CLIENT_CONNECT, $ctx
    );
    if (!$sock) return false;

    stream_set_timeout($sock, $timeout);

    // Helper: read one full SMTP response (handles multi-line)
    $read = function() use ($sock): string {
        $out = '';
        while (($line = fgets($sock, 512)) !== false) {
            $out .= $line;
            // Last line of a response has a space at position 3 (e.g. "250 OK")
            // Continuation lines have '-' (e.g. "250-STARTTLS")
            if (isset($line[3]) && $line[3] === ' ') break;
        }
        return $out;
    };

    // Helper: send a command and read response
    $send = function(string $cmd) use ($sock, $read): string {
        fwrite($sock, $cmd . "\r\n");
        return $read();
    };

    // Read server greeting
    $banner = $read();
    if (strpos($banner, '220') === false) { fclose($sock); return false; }

    // EHLO
    $ehlo = $send('EHLO learnora.uz');
    if (strpos($ehlo, '250') === false) {
        // Try HELO as fallback
        $helo = $send('HELO learnora.uz');
        if (strpos($helo, '250') === false) { fclose($sock); return false; }
    }

    // STARTTLS upgrade for port 587
    if (!$ssl) {
        $tls = $send('STARTTLS');
        if (strpos($tls, '220') !== false) {
            stream_socket_enable_crypto($sock, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
            $send('EHLO learnora.uz');
        }
    }

    // AUTH LOGIN
    $r = $send('AUTH LOGIN');
    if (strpos($r, '334') === false) { fclose($sock); return false; }
    $r = $send(base64_encode($user));
    if (strpos($r, '334') === false) { fclose($sock); return false; }
    $r = $send(base64_encode($pass));
    if (strpos($r, '235') === false) { fclose($sock); return false; }

    // Envelope
    $r = $send("MAIL FROM:<{$from}>");
    if (strpos($r, '250') === false) { fclose($sock); return false; }

    $r = $send("RCPT TO:<{$toEmail}>");
    if (strpos($r, '250') === false && strpos($r, '251') === false) { fclose($sock); return false; }

    // Start DATA
    $r = $send('DATA');
    if (strpos($r, '354') === false) { fclose($sock); return false; }

    // Build RFC-2822 message body
    $boundary = bin2hex(random_bytes(8));
    $plain    = strip_tags(preg_replace('/<br\s*\/?>/i', "\n", $htmlBody));
    $plain    = wordwrap(html_entity_decode($plain, ENT_QUOTES, 'UTF-8'), 72, "\n", true);

    $headers  = "Date: " . date('r') . "\r\n"
              . "Message-ID: <" . bin2hex(random_bytes(16)) . "@learnora.uz>\r\n"
              . "From: =?UTF-8?B?" . base64_encode(SMTP_NAME) . "?= <{$from}>\r\n"
              . "To: =?UTF-8?B?" . base64_encode($toName) . "?= <{$toEmail}>\r\n"
              . "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n"
              . "MIME-Version: 1.0\r\n"
              . "Content-Type: multipart/alternative; boundary=\"{$boundary}\"\r\n"
              . "\r\n";

    $body = "--{$boundary}\r\n"
          . "Content-Type: text/plain; charset=UTF-8\r\n"
          . "Content-Transfer-Encoding: base64\r\n\r\n"
          . chunk_split(base64_encode($plain))
          . "--{$boundary}\r\n"
          . "Content-Type: text/html; charset=UTF-8\r\n"
          . "Content-Transfer-Encoding: base64\r\n\r\n"
          . chunk_split(base64_encode($htmlBody))
          . "--{$boundary}--";

    // Send message — DATA ends with a lone dot on its own line
    fwrite($sock, $headers . $body . "\r\n.\r\n");
    $r = $read();

    $send('QUIT');
    fclose($sock);

    return strpos($r, '250') !== false;
}

/**
 * Fallback: PHP mail() — works when SMTP socket is blocked by the host.
 */
function sendMailFallback(string $toEmail, string $toName, string $subject, string $htmlBody): bool {
    $from     = SMTP_FROM;
    $fromName = SMTP_NAME;
    $plain    = strip_tags(preg_replace('/<br\s*\/?>/i', "\n", $htmlBody));

    $headers  = "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <{$from}>\r\n"
              . "Reply-To: {$from}\r\n"
              . "MIME-Version: 1.0\r\n"
              . "Content-Type: text/html; charset=UTF-8\r\n"
              . "Content-Transfer-Encoding: base64";

    $encodedSubject = "=?UTF-8?B?" . base64_encode($subject) . "?=";

    return @mail(
        "{$toName} <{$toEmail}>",
        $encodedSubject,
        base64_encode($htmlBody),
        $headers
    );
}

/**
 * Build a branded HTML email template.
 */
function emailTemplate(string $title, string $bodyHtml, string $preview = ''): string {
    $previewText = $preview ?: strip_tags($bodyHtml);
    $previewText = htmlspecialchars(substr($previewText, 0, 120));
    $titleEscaped = htmlspecialchars($title);
    $year = date('Y');
    return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{$titleEscaped}</title>
</head>
<body style="margin:0;padding:0;background:#F4F7FF;font-family:Inter,Arial,sans-serif">
  <span style="display:none;max-height:0;overflow:hidden">{$previewText}</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F7FF;padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(13,27,75,0.10)">
        <tr>
          <td style="background:linear-gradient(160deg,#0a1535 0%,#0D1B4B 60%,#112260 100%);padding:32px 40px;text-align:center">
            <div style="font-size:1.8rem;font-weight:900;letter-spacing:-0.02em;color:#fff">
              Learn<span style="color:#3ec6f0">ora</span>
            </div>
            <div style="font-size:0.8rem;color:rgba(255,255,255,0.55);margin-top:4px;letter-spacing:0.05em">Educational Social Platform</div>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;color:#1e293b;font-size:0.95rem;line-height:1.7">
            {$bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="background:#F4F7FF;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0">
            <p style="margin:0;font-size:0.78rem;color:#94a3b8">
              &copy; {$year} Learnora &mdash; <a href="https://learnora.uz" style="color:#1565C0;text-decoration:none">learnora.uz</a>
            </p>
            <p style="margin:6px 0 0;font-size:0.72rem;color:#cbd5e1">This email was sent from the Learnora platform.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
HTML;
}