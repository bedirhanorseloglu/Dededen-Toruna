<?php
declare(strict_types=1);
require __DIR__ . '/../config.php';
require __DIR__ . '/../helpers.php';
json_response(['ok'=>true,'orders'=>orders_board_payload($pdo),'signature'=>orders_board_signature($pdo)]);
