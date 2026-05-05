-- =====================================================================
-- M6 system templates added for SCM Milestone 1.
-- 5 new template codes: ARRIVAL_NOTICE_RATED, ARRIVAL_NOTICE,
-- DELIVERY_ORDER, RELEASE_INSTRUCTIONS, LETTER_OF_GUARANTEE.
-- Bodies are intentionally minimal HTML shells; tenants can fork +
-- customise via M6 template versioning.
-- =====================================================================

USE ulp_dev;

INSERT IGNORE INTO m6_template
  (id, tenant_id, code, country_code, name, description, template_type, rendering_engine,
   is_active, version, created_at_utc, modified_at_utc) VALUES
  ( 8, NULL, 'ARRIVAL_NOTICE_RATED', NULL, 'Arrival Notice (rated)',
       'Sent to consignee on vessel arrival; includes freight + destination charges line items',
       'HTML', 'SCRIBAN', 1, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ( 9, NULL, 'ARRIVAL_NOTICE',       NULL, 'Arrival Notice (non-rated)',
       'Sent to consignee on vessel arrival; informational, no charges shown',
       'HTML', 'SCRIBAN', 1, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (10, NULL, 'DELIVERY_ORDER',       NULL, 'Delivery Order (D/O)',
       'Authorises terminal to release cargo to nominated trucker / consignee',
       'HTML', 'SCRIBAN', 1, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (11, NULL, 'RELEASE_INSTRUCTIONS', NULL, 'Release Instructions',
       'Carrier release instructions — telex / surrender / express',
       'HTML', 'SCRIBAN', 1, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (12, NULL, 'LETTER_OF_GUARANTEE',  NULL, 'Letter of Guarantee (LoG)',
       'Cargo release guarantee against missing OBL, signed by consignee',
       'HTML', 'SCRIBAN', 1, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- Template version 1 — Scriban-compatible shells. Renders cleanly with the
-- M5 ShipmentDetail payload (vessel/voyage/eta/atd/ports + party names).
INSERT IGNORE INTO m6_template_version (template_id, version_number, body, created_by, created_at_utc, comment) VALUES
(8, 1,
'<!doctype html><html><head><meta charset="utf-8"/><title>Arrival Notice (rated)</title>
<style>body{font:13px/1.45 system-ui;color:#1A1A33;margin:24px;}
h1{font-size:18px;margin:0 0 4px;color:#3F2D7C;}
.meta{color:#6B5BA0;font-size:12px;margin-bottom:16px;}
table{width:100%;border-collapse:collapse;margin-top:8px;}
th,td{border-bottom:1px solid #E8E2F4;padding:6px 8px;text-align:left;font-size:12px;}
th{background:#F5F2FB;color:#3F2D7C;}.r{text-align:right;}
.tot{font-weight:700;background:#F5F2FB;}</style></head><body>
<h1>Arrival Notice — RATED</h1>
<div class="meta">Issued by {{ tenant_name }} · {{ issue_date }}</div>
<p><strong>Consignee:</strong> {{ consignee_name }}<br/>{{ consignee_address }}</p>
<p><strong>Vessel / voyage:</strong> {{ vessel }} / {{ voyage }}<br/>
<strong>POL → POD:</strong> {{ pol }} → {{ pod }}<br/>
<strong>ETA:</strong> {{ eta }} · <strong>MBL:</strong> {{ mbl_number }} · <strong>HBL:</strong> {{ hbl_number }}</p>
<table>
  <thead><tr><th>Charge</th><th class="r">Qty</th><th>UOM</th><th class="r">Unit</th><th class="r">Amount</th></tr></thead>
  <tbody>
    {{ for c in charges }}
    <tr><td>{{ c.charge_code }}</td><td class="r">{{ c.quantity }}</td><td>{{ c.uom_code }}</td>
        <td class="r">{{ c.unit_price_amount }} {{ c.unit_price_currency }}</td>
        <td class="r">{{ c.amount_amount }} {{ c.amount_currency }}</td></tr>
    {{ end }}
    <tr class="tot"><td colspan="4" class="r">Total</td><td class="r">{{ total }} {{ currency }}</td></tr>
  </tbody>
</table>
<p style="margin-top:24px;font-size:11px;color:#6B5BA0;">Containers must be returned within {{ free_days }} free days. Demurrage will apply thereafter.</p>
</body></html>', 0, CURRENT_TIMESTAMP(3), 'system v1 arrival notice (rated)'),

(9, 1,
'<!doctype html><html><head><meta charset="utf-8"/><title>Arrival Notice</title>
<style>body{font:13px/1.45 system-ui;color:#1A1A33;margin:24px;} h1{color:#3F2D7C;font-size:18px;margin:0 0 4px;}
.meta{color:#6B5BA0;font-size:12px;margin-bottom:16px;}</style></head><body>
<h1>Arrival Notice</h1>
<div class="meta">Issued by {{ tenant_name }} · {{ issue_date }}</div>
<p><strong>Consignee:</strong> {{ consignee_name }}<br/>{{ consignee_address }}</p>
<p><strong>Vessel / voyage:</strong> {{ vessel }} / {{ voyage }}<br/>
<strong>POL → POD:</strong> {{ pol }} → {{ pod }}<br/>
<strong>ETA:</strong> {{ eta }} · <strong>MBL:</strong> {{ mbl_number }} · <strong>HBL:</strong> {{ hbl_number }}</p>
<p>Please contact our office to arrange delivery / pick-up.</p>
</body></html>', 0, CURRENT_TIMESTAMP(3), 'system v1 arrival notice (non-rated)'),

(10, 1,
'<!doctype html><html><head><meta charset="utf-8"/><title>Delivery Order</title>
<style>body{font:13px/1.45 system-ui;color:#1A1A33;margin:24px;} h1{color:#3F2D7C;font-size:18px;margin:0 0 4px;}
.box{border:1px solid #E8E2F4;padding:12px;border-radius:8px;margin:8px 0;}</style></head><body>
<h1>Delivery Order</h1>
<p>D/O #: <strong>{{ do_number }}</strong> · Date: {{ issue_date }}</p>
<div class="box"><strong>Authorised Trucker:</strong> {{ trucker_name }}<br/>{{ trucker_contact }}</div>
<div class="box"><strong>Pick-up at:</strong> {{ terminal_name }} · {{ terminal_address }}<br/>
<strong>Containers:</strong> {{ container_list }}</div>
<div class="box"><strong>Deliver to:</strong> {{ consignee_name }}<br/>{{ delivery_address }}</div>
<p style="margin-top:24px;font-size:11px;color:#6B5BA0;">Terminal: please release the above containers to bearer of this Delivery Order.</p>
</body></html>', 0, CURRENT_TIMESTAMP(3), 'system v1 delivery order'),

(11, 1,
'<!doctype html><html><head><meta charset="utf-8"/><title>Release Instructions</title>
<style>body{font:13px/1.45 system-ui;color:#1A1A33;margin:24px;} h1{color:#3F2D7C;font-size:18px;margin:0 0 4px;}
.kv{margin:6px 0;}.k{display:inline-block;width:160px;color:#6B5BA0;}</style></head><body>
<h1>Release Instructions</h1>
<p>Date: {{ issue_date }}</p>
<div class="kv"><span class="k">B/L number</span>{{ bl_number }}</div>
<div class="kv"><span class="k">Release type</span>{{ release_type }}</div>
<div class="kv"><span class="k">Consignee</span>{{ consignee_name }}</div>
<div class="kv"><span class="k">Carrier</span>{{ carrier_name }}</div>
<div class="kv"><span class="k">Vessel / voyage</span>{{ vessel }} / {{ voyage }}</div>
<p style="margin-top:24px;font-size:11px;color:#6B5BA0;">Carrier is hereby authorised to release the cargo described on the above B/L per the indicated release type.</p>
</body></html>', 0, CURRENT_TIMESTAMP(3), 'system v1 release instructions'),

(12, 1,
'<!doctype html><html><head><meta charset="utf-8"/><title>Letter of Guarantee</title>
<style>body{font:13px/1.45 system-ui;color:#1A1A33;margin:24px;} h1{color:#3F2D7C;font-size:18px;margin:0 0 4px;}
p{margin:10px 0;}</style></head><body>
<h1>Letter of Guarantee</h1>
<p>To: {{ carrier_name }}<br/>Date: {{ issue_date }}</p>
<p>We, <strong>{{ consignee_name }}</strong>, hereby request that you release the cargo covered by Bill of Lading No. <strong>{{ bl_number }}</strong> shipped per <strong>{{ vessel }}</strong> voyage <strong>{{ voyage }}</strong> from <strong>{{ pol }}</strong> to <strong>{{ pod }}</strong>, without surrender of the original Bills of Lading.</p>
<p>In consideration of your so doing, we agree to indemnify you and hold you harmless from any loss, claim, or damage arising therefrom.</p>
<p>Authorised signatory:<br/>__________________________<br/>{{ signatory_name }} · {{ signatory_title }}</p>
</body></html>', 0, CURRENT_TIMESTAMP(3), 'system v1 letter of guarantee');
