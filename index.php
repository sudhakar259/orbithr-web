<?php
// Redirect all non-file requests to the built index.html
if (file_exists(__DIR__ . '/public/' . $_SERVER['REQUEST_URI'])) {
    return false;
}
readfile(__DIR__ . '/public/index.html');
