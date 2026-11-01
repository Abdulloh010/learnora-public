<?php
require 'config.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') jsonError('Method not allowed', 405);

$user = requireAuth();
$type = $_POST['type'] ?? 'avatar'; // 'avatar' | 'file'

if (empty($_FILES['file'])) jsonError('No file uploaded');
$file = $_FILES['file'];
if (is_array($file['error'] ?? null)) jsonError('Upload one file at a time');
if ($file['error'] !== UPLOAD_ERR_OK) jsonError('Upload error: ' . $file['error']);

// Use finfo for reliable MIME detection (mime_content_type() deprecated in PHP 8.1)
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime  = $finfo->file($file['tmp_name']);
if (!$mime) jsonError('Could not detect file type');

$imgTypes = ['image/jpeg','image/png','image/gif','image/webp'];

if ($type === 'avatar') {
    if ($file['size'] > 5 * 1024 * 1024) jsonError('File too large (max 5 MB)');
    if (!in_array($mime, $imgTypes)) jsonError('Invalid file type. Use JPG, PNG, GIF or WebP');
    $subDir = 'avatars';
} else {
    $videoTypes = ['video/webm','video/mp4','video/ogg','video/quicktime','video/x-msvideo','video/mpeg'];
    $allowed = array_merge($imgTypes, $videoTypes, [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
    ]);
    if (!in_array($mime, $allowed)) jsonError('File type not supported');
    // Allow larger uploads for video files
    $maxSize = in_array($mime, $videoTypes) ? 100 * 1024 * 1024 : 20 * 1024 * 1024;
    if ($file['size'] > $maxSize) jsonError('File too large (max ' . ($maxSize / 1024 / 1024) . ' MB)');
    $subDir = 'files';
}

// Sanitize original filename, keep extension
$origName  = pathinfo($file['name'], PATHINFO_FILENAME);
$origName  = preg_replace('/[^a-zA-Z0-9._-]/', '_', $origName);
$ext       = pathinfo($file['name'], PATHINFO_EXTENSION);
$ext       = preg_replace('/[^a-zA-Z0-9]/', '', $ext);
$fileName  = ($type === 'avatar' ? 'avatar_' . $user['id'] . '_' : 'file_') . time() . '_' . uniqid() . ($ext ? '.' . $ext : '');

// Determine absolute upload directory (one level up from api/)
$uploadDir = dirname(__DIR__) . '/uploads/' . $subDir . '/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Save file locally first (reliable, no external dependency)
$localPath = $uploadDir . $fileName;
if (!move_uploaded_file($file['tmp_name'], $localPath)) {
    jsonError('Failed to save file. Check server permissions.');
}

// Build public URL for this file
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host     = $_SERVER['HTTP_HOST'] ?? 'localhost';
// Detect base path (e.g., if app lives at /learnora/ instead of root)
$scriptDir  = dirname(dirname($_SERVER['SCRIPT_NAME'])); // go up from /api/upload.php → /
$basePath   = rtrim($scriptDir, '/');
$url        = $protocol . '://' . $host . $basePath . '/uploads/' . $subDir . '/' . $fileName;

// Optionally try ImageKit CDN for images only — skip for videos (too large, base64 causes OOM/timeout)
$isVideo   = isset($videoTypes) && in_array($mime, $videoTypes);
$ikPrivKey = cfg('IMAGEKIT_PRIVATE_KEY');
if ($ikPrivKey && function_exists('curl_init') && !$isVideo) {
    $fileData = base64_encode(file_get_contents($localPath));
    $ch = curl_init('https://upload.imagekit.io/api/v1/files/upload');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_USERPWD        => $ikPrivKey . ':',
        CURLOPT_POSTFIELDS     => [
            'file'             => 'data:' . $mime . ';base64,' . $fileData,
            'fileName'         => $fileName,
            'folder'           => '/' . $subDir,
            'useUniqueFileName'=> 'false',
        ],
    ]);
    $ikResponse = curl_exec($ch);
    $ikCode     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($ikCode === 200 && $ikResponse) {
        $ikResult = json_decode($ikResponse, true);
        if (!empty($ikResult['url'])) {
            $url = $ikResult['url']; // prefer CDN URL when available
        }
    }
}

// Update avatar_url in DB for avatar uploads
if ($type === 'avatar') {
    getDB()->prepare('UPDATE users SET avatar_url=? WHERE id=?')->execute([$url, $user['id']]);
}

jsonSuccess(['url' => $url, 'name' => $file['name'], 'mime' => $mime]);
