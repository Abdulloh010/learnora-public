<?php
/* Copy this file to api/secrets.php on the server and fill in real values.
   api/secrets.php is git-ignored and never deployed from GitHub, so keys stay off GitHub. */
return [
    'DB_HOST'               => 'localhost',
    'DB_NAME'               => '',
    'DB_USER'               => '',
    'DB_PASS'               => '',
    'APP_SECRET'            => '',   // any long random string
    'CRON_SECRET'           => '',   // key for calling api/cron.php over HTTP

    'SMTP_HOST'             => 'mail.learnora.uz',
    'SMTP_PORT'             => '465',
    'SMTP_USER'             => 'support@learnora.uz',
    'SMTP_PASS'             => '',
    'SMTP_FROM'             => 'support@learnora.uz',

    'UPLOADCARE_PUB_KEY'    => '',
    'UPLOADCARE_SECRET_KEY' => '',

    'JAAS_APP_ID'           => '',
    'JAAS_API_KEY_ID'       => '',
    'JAAS_PRIVATE_KEY_FILE' => '',   // path to the .pk file (preferred), or:
    'JAAS_PRIVATE_KEY'      => '',   // the full PEM text

    'IMAGEKIT_PRIVATE_KEY'  => '',   // optional: image CDN uploads

    'GOOGLE_CLIENT_ID'      => '',
    'TELEGRAM_BOT_TOKEN'    => '',
    'TELEGRAM_BOT_NAME'     => 'learnorabot',
];
