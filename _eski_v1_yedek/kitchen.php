<?php
declare(strict_types=1);
// Eski bağlantılar boşa düşmesin; V10'daki sade Adisyonlar ekranına yönlendir.
header('Location: orders.php', true, 302);
exit;
