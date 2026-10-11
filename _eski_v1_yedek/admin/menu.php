<?php
declare(strict_types=1);
require __DIR__ . '/../config.php';
require __DIR__ . '/../helpers.php';
require_admin();

$profile = business_profile($pdo);
$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf($_POST['csrf'] ?? null);
    $action = (string)($_POST['action'] ?? '');
    try {
        $changed = false;
        if ($action === 'add_category') {
            $name = trim((string)($_POST['name'] ?? ''));
            $sort = (int)($_POST['sort_order'] ?? 0);
            if ($name === '') throw new RuntimeException('Kategori adı boş olamaz.');
            $stmt = $pdo->prepare('INSERT INTO categories(name,sort_order) VALUES(?,?)');
            $stmt->execute([$name,$sort]);
            $message = 'Kategori eklendi.'; $changed = true;
        }
        if ($action === 'edit_category') {
            $id = filter_var($_POST['id'] ?? null, FILTER_VALIDATE_INT);
            $name = trim((string)($_POST['name'] ?? ''));
            $sort = (int)($_POST['sort_order'] ?? 0);
            if (!$id || $name === '') throw new RuntimeException('Kategori bilgileri geçersiz.');
            $stmt = $pdo->prepare('UPDATE categories SET name=?,sort_order=? WHERE id=?');
            $stmt->execute([$name,$sort,$id]);
            $message = 'Kategori güncellendi.'; $changed = true;
        }
        if ($action === 'delete_category') {
            $id = filter_var($_POST['id'] ?? null, FILTER_VALIDATE_INT);
            if (!$id) throw new RuntimeException('Geçersiz kategori.');
            $stmt = $pdo->prepare('SELECT COUNT(*) FROM products WHERE category_id=?');
            $stmt->execute([$id]);
            if ((int)$stmt->fetchColumn() > 0) throw new RuntimeException('Bu kategoride ürün var. Önce ürünleri başka kategoriye taşıyın veya silin.');
            $pdo->prepare('DELETE FROM categories WHERE id=?')->execute([$id]);
            $message = 'Kategori silindi.'; $changed = true;
        }
        if ($action === 'add_product' || $action === 'edit_product') {
            $name = trim((string)($_POST['name'] ?? ''));
            $desc = trim((string)($_POST['description'] ?? ''));
            $cat = filter_var($_POST['category_id'] ?? null, FILTER_VALIDATE_INT);
            $price = filter_var(str_replace(',','.',(string)($_POST['price'] ?? '')), FILTER_VALIDATE_FLOAT);
            if ($name === '' || !$cat || $price === false || $price < 0) throw new RuntimeException('Ürün bilgileri geçersiz.');
            if (text_length($name) > 160) throw new RuntimeException('Ürün adı çok uzun.');
            if ($action === 'add_product') {
                $stmt = $pdo->prepare('INSERT INTO products(category_id,name,description,price,is_active) VALUES(?,?,?,?,1)');
                $stmt->execute([$cat,$name,$desc !== '' ? $desc : null,$price]);
                $message = 'Ürün eklendi. Menü diğer cihazlarda otomatik güncellenecek.';
            } else {
                $id = filter_var($_POST['id'] ?? null, FILTER_VALIDATE_INT);
                if (!$id) throw new RuntimeException('Geçersiz ürün.');
                $stmt = $pdo->prepare('UPDATE products SET category_id=?,name=?,description=?,price=? WHERE id=?');
                $stmt->execute([$cat,$name,$desc !== '' ? $desc : null,$price,$id]);
                $message = 'Ürün güncellendi.';
            }
            $changed = true;
        }
        if ($action === 'toggle_product') {
            $id = filter_var($_POST['id'] ?? null, FILTER_VALIDATE_INT);
            if (!$id) throw new RuntimeException('Geçersiz ürün.');
            $pdo->prepare('UPDATE products SET is_active=IF(is_active=1,0,1) WHERE id=?')->execute([$id]);
            $message = 'Ürün görünürlüğü değiştirildi.'; $changed = true;
        }
        if ($action === 'delete_product') {
            $id = filter_var($_POST['id'] ?? null, FILTER_VALIDATE_INT);
            if (!$id) throw new RuntimeException('Geçersiz ürün.');
            $pdo->prepare('DELETE FROM products WHERE id=?')->execute([$id]);
            $message = 'Ürün silindi. Geçmiş adisyon kayıtları korunur.'; $changed = true;
        }
        if ($changed) bump_menu_revision($pdo);
    } catch (Throwable $e) {
        $error = ($e instanceof PDOException && $e->getCode() === '23000')
            ? 'Aynı isimde kayıt olabilir veya veritabanı ilişkisi işlemi engelliyor.'
            : $e->getMessage();
    }
}

$categories = $pdo->query('SELECT id,name,sort_order FROM categories ORDER BY sort_order,name')->fetchAll();
$products = $pdo->query('SELECT p.id,p.name,p.description,p.price,p.is_active,p.category_id,c.name category_name,c.sort_order category_sort FROM products p JOIN categories c ON c.id=p.category_id ORDER BY c.sort_order,c.name,p.price DESC,p.name ASC')->fetchAll();
$csrf = csrf_token();
$activePage = 'menu';
$pageTitle = 'Menü Yönetimi';
require __DIR__ . '/_top.php';
?>
<section class="admin-heading">
    <div><div class="eyebrow">Menü Yönetimi</div><h1 class="admin-title">Kategoriler ve ürünler</h1><p class="muted">Ürünler sipariş ekranında kategori içinde otomatik olarak <strong>pahalıdan uyguna</strong> sıralanır. Elle sıra vermen gerekmez.</p></div>
    <span class="live-pill"><i></i> Canlı menü #<?= menu_revision($pdo) ?></span>
</section>
<?php if ($message): ?><div class="alert alert-success"><?= e($message) ?></div><?php endif; ?>
<?php if ($error): ?><div class="alert alert-error"><?= e($error) ?></div><?php endif; ?>

<section class="panel">
    <div class="panel-title"><div><div class="eyebrow">Kategori</div><h2>Kategoriler</h2></div><span class="badge gold"><?= count($categories) ?> kategori</span></div>
    <form method="post" class="form-row category-add-row">
        <input type="hidden" name="csrf" value="<?= e($csrf) ?>"><input type="hidden" name="action" value="add_category">
        <label>Kategori adı<input name="name" required></label>
        <label>Kategori sırası<input type="number" name="sort_order" value="0"><small>10, 20, 30 gibi</small></label>
        <button class="btn btn-primary">Kategori Ekle</button>
    </form>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Kategori</th><th>Sıra</th><th>İşlem</th></tr></thead><tbody>
    <?php foreach ($categories as $c): ?>
        <tr><td colspan="3"><form method="post" class="category-edit-grid"><input type="hidden" name="csrf" value="<?= e($csrf) ?>"><input type="hidden" name="id" value="<?= (int)$c['id'] ?>"><label>Ad<input name="name" value="<?= e($c['name']) ?>" required></label><label>Sıra<input type="number" name="sort_order" value="<?= (int)$c['sort_order'] ?>"></label><div class="inline-actions"><button class="btn btn-sm" name="action" value="edit_category">Kaydet</button><button class="btn btn-sm btn-danger" name="action" value="delete_category" onclick="return confirm('Kategori silinsin mi?')">Sil</button></div></form></td></tr>
    <?php endforeach; ?>
    </tbody></table></div>
</section>

<section class="panel">
    <div class="panel-title"><div><div class="eyebrow">Ürün</div><h2>Ürünler ve fiyatlar</h2></div><span class="badge gold"><?= count($products) ?> ürün</span></div>
    <?php if ($categories): ?>
    <form method="post" class="product-add-grid v4-product-add">
        <input type="hidden" name="csrf" value="<?= e($csrf) ?>"><input type="hidden" name="action" value="add_product">
        <label>Ürün adı<input name="name" required></label>
        <label>Açıklama<input name="description"></label>
        <label>Kategori<select name="category_id"><?php foreach ($categories as $c): ?><option value="<?= (int)$c['id'] ?>"><?= e($c['name']) ?></option><?php endforeach; ?></select></label>
        <label>Fiyat<input type="number" name="price" min="0" step="0.01" required></label>
        <button class="btn btn-primary">Ürün Ekle</button>
    </form>
    <?php endif; ?>
    <div class="admin-menu-hint">Sipariş ekranı sırası: <strong>kategori sırası → fiyat yüksekten düşüğe → ürün adı</strong>.</div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Ürün</th><th>Açıklama</th><th>Kategori</th><th>Fiyat</th><th>Durum</th><th>İşlem</th></tr></thead><tbody>
    <?php foreach ($products as $p): ?>
        <tr><td colspan="6"><form method="post" class="product-edit-grid v4-product-edit"><input type="hidden" name="csrf" value="<?= e($csrf) ?>"><input type="hidden" name="id" value="<?= (int)$p['id'] ?>"><label>Ad<input name="name" value="<?= e($p['name']) ?>" required></label><label>Açıklama<input name="description" value="<?= e((string)($p['description'] ?? '')) ?>"></label><label>Kategori<select name="category_id"><?php foreach ($categories as $c): ?><option value="<?= (int)$c['id'] ?>" <?= (int)$c['id'] === (int)$p['category_id'] ? 'selected' : '' ?>><?= e($c['name']) ?></option><?php endforeach; ?></select></label><label>Fiyat<input type="number" name="price" min="0" step="0.01" value="<?= e((string)$p['price']) ?>" required></label><div><span class="badge <?= (int)$p['is_active'] ? 'success' : '' ?>"><?= (int)$p['is_active'] ? 'Aktif' : 'Pasif' ?></span></div><div class="inline-actions"><button class="btn btn-sm" name="action" value="edit_product">Kaydet</button><button class="btn btn-sm" name="action" value="toggle_product"><?= (int)$p['is_active'] ? 'Gizle' : 'Aktif Et' ?></button><button class="btn btn-sm btn-danger" name="action" value="delete_product" onclick="return confirm('Ürün kalıcı olarak silinsin mi?')">Sil</button></div></form></td></tr>
    <?php endforeach; ?>
    </tbody></table></div>
</section>
<?php require __DIR__ . '/_bottom.php'; ?>
