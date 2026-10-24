<?php
require __DIR__ . '/config.php';
header('Content-Type: application/json; charset=utf-8');

function out($data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function time_or_null($v) {
    $v = trim((string)$v);
    return preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $v) ? $v : null;
}

function s($v, int $max = 255): string {
    return mb_substr(trim((string)$v), 0, $max);
}

function date_or_today($v): string {
    return preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)$v) ? $v : date('Y-m-d');
}

/* Which entity: time reports (default) or discharge lists */
$type = ($_GET['type'] ?? 'time') === 'discharge' ? 'discharge' : 'time';
$action = $_GET['action'] ?? '';
$body = json_decode(file_get_contents('php://input'), true) ?: [];

try {
    $pdo = db();

    /* ---------- LIST / SEARCH ---------- */
    if ($action === 'list') {
        $tbl  = $type === 'time' ? 'time_reports' : 'discharge_lists';
        $dcol = $type === 'time' ? 'report_date' : 'list_date';
        $where = []; $p = [];

        if (($q = s($_GET['q'] ?? '')) !== '') {
            $where[] = '(mv LIKE :q OR voy LIKE :q OR berth LIKE :q OR yard_no LIKE :q' . ($type === 'time' ? ' OR report_type LIKE :q' : '') . ')';
            $p[':q'] = "%$q%";
        }
        if (!empty($_GET['from'])) { $where[] = "$dcol >= :f"; $p[':f'] = $_GET['from']; }
        if (!empty($_GET['to']))   { $where[] = "$dcol <= :t"; $p[':t'] = $_GET['to']; }
        if (!empty($_GET['shift'])) { $where[] = 'shift = :s'; $p[':s'] = $_GET['shift']; }
        if (!empty($_GET['rtype']) && $type === 'time') { $where[] = 'report_type = :rt'; $p[':rt'] = $_GET['rtype']; }
        if (!empty($_GET['yard']))  { $where[] = 'yard_no = :y'; $p[':y'] = $_GET['yard']; }
        if (!empty($_GET['berth'])) { $where[] = 'berth = :b'; $p[':b'] = $_GET['berth']; }

        $sql = "SELECT *, $dcol AS the_date FROM $tbl"
             . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
             . " ORDER BY $dcol DESC, id DESC LIMIT 1000";
        $st = $pdo->prepare($sql); $st->execute($p);
        out(['ok' => true, 'rows' => $st->fetchAll()]);
    }

    /* ---------- COUNTS + FILTER VALUES ---------- */
    if ($action === 'meta') {
        $c1 = (int)$pdo->query('SELECT COUNT(*) FROM time_reports')->fetchColumn();
        $c2 = (int)$pdo->query('SELECT COUNT(*) FROM discharge_lists')->fetchColumn();
        $berths = $pdo->query("SELECT DISTINCT berth FROM time_reports WHERE berth<>'' UNION SELECT DISTINCT berth FROM discharge_lists WHERE berth<>'' ORDER BY berth")->fetchAll(PDO::FETCH_COLUMN);
        $yards  = $pdo->query("SELECT DISTINCT yard_no FROM time_reports WHERE yard_no<>'' UNION SELECT DISTINCT yard_no FROM discharge_lists WHERE yard_no<>'' ORDER BY yard_no")->fetchAll(PDO::FETCH_COLUMN);
        out(['ok' => true, 'time' => $c1, 'discharge' => $c2, 'berths' => $berths, 'yards' => $yards]);
    }

    /* ---------- GET ONE ---------- */
    if ($action === 'get') {
        $id = (int)($_GET['id'] ?? 0);
        if ($type === 'time') {
            $st = $pdo->prepare('SELECT * FROM time_reports WHERE id=?'); $st->execute([$id]);
            $r = $st->fetch();
            if (!$r) out(['ok' => false, 'error' => 'Not found'], 404);
            foreach (['activities' => 'work_activities', 'equipment' => 'equipment_usage'] as $k => $t) {
                $q = $pdo->prepare("SELECT * FROM $t WHERE report_id=? ORDER BY sort_order, id"); $q->execute([$id]);
                $r[$k] = $q->fetchAll();
            }
            $q = $pdo->prepare('SELECT role, badge FROM manpower WHERE report_id=? ORDER BY sort_order, id'); $q->execute([$id]);
            $r['manpower'] = ['FOREMAN' => [], 'TALLYMAN' => [], 'DOCKER' => []];
            foreach ($q->fetchAll() as $m) $r['manpower'][$m['role']][] = $m['badge'];
        } else {
            $st = $pdo->prepare('SELECT * FROM discharge_lists WHERE id=?'); $st->execute([$id]);
            $r = $st->fetch();
            if (!$r) out(['ok' => false, 'error' => 'Not found'], 404);
            $q = $pdo->prepare('SELECT * FROM discharge_items WHERE list_id=? ORDER BY sort_order, id'); $q->execute([$id]);
            $r['items'] = $q->fetchAll();
        }
        out(['ok' => true, 'row' => $r]);
    }

    /* ---------- SAVE (insert or update) ---------- */
    if ($action === 'save') {
        $id = (int)($body['id'] ?? 0);
        $pdo->beginTransaction();

        if ($type === 'time') {
            $f = [
                s($body['mv'] ?? '', 120), s($body['voy'] ?? '', 80), date_or_today($body['date'] ?? ''),
                s($body['shift'] ?? '', 20), s($body['berth'] ?? '', 40), s($body['bollard'] ?? '', 40),
                s($body['yard_no'] ?? '', 120), (string)($body['what_we_do'] ?? ''), s($body['report_type'] ?? '', 60),
                s($body['sign_name'] ?? '', 120), (string)($body['signature'] ?? ''), s($body['created_by'] ?? '', 120), s($body['created_by_user'] ?? '', 60),
            ];
            if ($id) {
                $pdo->prepare('UPDATE time_reports SET mv=?,voy=?,report_date=?,shift=?,berth=?,bollard=?,yard_no=?,what_we_do=?,report_type=?,sign_name=?,signature=?,created_by=?,created_by_user=? WHERE id=?')
                    ->execute([...$f, $id]);
                foreach (['work_activities', 'manpower', 'equipment_usage'] as $t)
                    $pdo->prepare("DELETE FROM $t WHERE report_id=?")->execute([$id]);
            } else {
                $pdo->prepare('INSERT INTO time_reports (mv,voy,report_date,shift,berth,bollard,yard_no,what_we_do,report_type,sign_name,signature,created_by,created_by_user) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')->execute($f);
                $id = (int)$pdo->lastInsertId();
            }
            $ins = $pdo->prepare('INSERT INTO work_activities (report_id,start_time,end_time,qty,what_we_use,sort_order) VALUES (?,?,?,?,?,?)');
            foreach (($body['activities'] ?? []) as $i => $a) {
                if (!time_or_null($a['start_time'] ?? '') && !time_or_null($a['end_time'] ?? '') && s($a['qty'] ?? '') === '' && s($a['what_we_use'] ?? '') === '') continue;
                $ins->execute([$id, time_or_null($a['start_time'] ?? ''), time_or_null($a['end_time'] ?? ''), s($a['qty'] ?? '', 40), s($a['what_we_use'] ?? ''), $i]);
            }
            $ins = $pdo->prepare('INSERT INTO manpower (report_id,role,badge,sort_order) VALUES (?,?,?,?)');
            foreach (['FOREMAN', 'TALLYMAN', 'DOCKER'] as $role)
                foreach (($body['manpower'][$role] ?? []) as $i => $b)
                    if (s($b, 40) !== '') $ins->execute([$id, $role, s($b, 40), $i]);
            $ins = $pdo->prepare('INSERT INTO equipment_usage (report_id,equipment,operator,start_time,end_time,sort_order) VALUES (?,?,?,?,?,?)');
            foreach (($body['equipment'] ?? []) as $i => $e) {
                if (s($e['equipment'] ?? '') === '' && s($e['operator'] ?? '') === '') continue;
                $ins->execute([$id, s($e['equipment'] ?? '', 120), s($e['operator'] ?? '', 120), time_or_null($e['start_time'] ?? ''), time_or_null($e['end_time'] ?? ''), $i]);
            }
        } else {
            $f = [
                s($body['mv'] ?? '', 120), s($body['voy'] ?? '', 80), date_or_today($body['date'] ?? ''),
                s($body['shift'] ?? '', 20), s($body['berth'] ?? '', 40), s($body['yard_no'] ?? '', 120),
                (string)($body['remarks'] ?? ''),
            ];
            if ($id) {
                $pdo->prepare('UPDATE discharge_lists SET mv=?,voy=?,list_date=?,shift=?,berth=?,yard_no=?,remarks=? WHERE id=?')->execute([...$f, $id]);
                $pdo->prepare('DELETE FROM discharge_items WHERE list_id=?')->execute([$id]);
            } else {
                $pdo->prepare('INSERT INTO discharge_lists (mv,voy,list_date,shift,berth,yard_no,remarks) VALUES (?,?,?,?,?,?,?)')->execute($f);
                $id = (int)$pdo->lastInsertId();
            }
            $ins = $pdo->prepare('INSERT INTO discharge_items (list_id,item_no,description,qty,unit,location,remarks,sort_order) VALUES (?,?,?,?,?,?,?,?)');
            foreach (($body['items'] ?? []) as $i => $it) {
                if (s($it['item_no'] ?? '') === '' && s($it['description'] ?? '') === '') continue;
                $ins->execute([$id, s($it['item_no'] ?? '', 60), s($it['description'] ?? ''), s($it['qty'] ?? '', 40), s($it['unit'] ?? '', 20), s($it['location'] ?? '', 80), s($it['remarks'] ?? ''), $i]);
            }
        }
        $pdo->commit();
        out(['ok' => true, 'id' => $id]);
    }

    /* ---------- PAMS DONE toggle (time reports) ---------- */
    if ($action === 'pams') {
        $id = (int)($body['id'] ?? 0);
        $pdo->prepare('UPDATE time_reports SET pams_done = 1 - pams_done WHERE id=?')->execute([$id]);
        $st = $pdo->prepare('SELECT pams_done FROM time_reports WHERE id=?'); $st->execute([$id]);
        out(['ok' => true, 'pams_done' => (int)$st->fetchColumn()]);
    }

    /* ---------- DELETE ---------- */
    if ($action === 'delete') {
        $id = (int)($body['id'] ?? 0);
        $tbl = $type === 'time' ? 'time_reports' : 'discharge_lists';
        $pdo->prepare("DELETE FROM $tbl WHERE id=?")->execute([$id]);
        out(['ok' => true]);
    }

    out(['ok' => false, 'error' => 'Unknown action'], 400);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    out(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
