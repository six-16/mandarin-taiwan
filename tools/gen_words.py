# Génère build/data/words.js à partir de la liste ci-dessous (pinyin / zhuyin calculés avec pypinyin).
# Convention : "py" = tons en chiffres par syllabe (5 = ton neutre) pour forcer une lecture ; sinon pypinyin.
import json, re, sys
from pypinyin import pinyin, Style
from pypinyin.style import convert
from pypinyin.contrib.tone_convert import tone3_to_tone

def is_han(c):
    return '一' <= c <= '鿿'

def syllables(zh, override=None):
    han = [c for c in zh if is_han(c)]
    if override:
        t3 = override.split()
    else:
        t3 = [p[0] for p in pinyin(''.join(han), style=Style.TONE3, neutral_tone_with_five=True)]
    assert len(t3) == len(han), (zh, t3)
    out = []
    for s in t3:
        m = re.match(r'^([a-z]+?)([1-5])?$', s)
        base, tone = m.group(1), int(m.group(2) or 5)
        zy = convert(base + (str(tone) if tone != 5 else ''), Style.BOPOMOFO, False)
        if tone == 5:
            zy = '˙' + zy.replace('˙', '')
        out.append({'py': tone3_to_tone(base + (str(tone) if tone != 5 else '')), 'zy': zy, 't': tone})
    return out

def ex_py(zh):
    han = ''.join(c for c in zh if is_han(c))
    t3 = [p[0] for p in pinyin(han, style=Style.TONE3, neutral_tone_with_five=True)]
    def tone(s): return int(s[-1]) if s[-1].isdigit() else 5
    for i, c in enumerate(han):
        nxt = tone(t3[i+1]) if i+1 < len(han) else None
        if c == '不' and nxt == 4:
            t3[i] = 'bu2'
        if c == '一' and nxt is not None:
            t3[i] = 'yi2' if nxt == 4 else 'yi4'
    # neutres
    for i, c in enumerate(han):
        if c == '個' and i > 0 and han[i-1] == '這': t3[i] = 'ge5'
        if c == '謝' and i > 0 and han[i-1] == '謝': t3[i] = 'xie5'
        if c == '字' and i > 0 and han[i-1] == '名': t3[i] = 'zi5'
        if c == '不' and i > 0 and han[i-1] == '對': t3[i] = 'bu5'
        if c == '思' and i > 0 and han[i-1] == '意': t3[i] = 'si5'
    return ' '.join(tone3_to_tone(x) for x in t3)

# (zh, py_override, fr, catégorie, explication, astuce_prononciation, exemple_zh, exemple_fr, exemple_py_override)
W = [
# ---------- Politesse ----------
("你好", "ni3 hao3", "bonjour", "Politesse",
 "Le bonjour universel, valable à toute heure et avec tout le monde. À Taïwan, un sourire et un petit signe de tête l'accompagnent souvent.",
 "Deux tons 3 de suite : le premier devient un ton 2, donc ça sonne « ní hǎo ». C'est normal, tout le monde le dit comme ça.",
 "你好，我是法國人。", "Bonjour, je suis français(e).", None),
("早安", None, "bonjour (le matin)", "Politesse",
 "Littéralement « matin tranquille ». On le dit jusqu'en fin de matinée, aux voisins, aux collègues, au vendeur du petit-déjeuner.",
 "Le ton 3 de « zǎo » descend puis remonte légèrement ; le « an » final est court, comme dans « an » français.",
 "早安！今天天氣很好。", "Bonjour ! Il fait beau aujourd'hui.", None),
("謝謝", "xie4 xie5", "merci", "Politesse",
 "Le mot à placer partout : en prenant un ticket, en sortant d'un taxi, au comptoir. Un « 謝謝 » avec un petit sourire ouvre toutes les portes.",
 "Le deuxième « xie » est neutre : léger et court. « x » se prononce entre « ch » et « s », langue plate, sourire aux lèvres.",
 "謝謝你的幫忙。", "Merci pour ton aide.", None),
("不客氣", "bu2 ke4 qi4", "de rien", "Politesse",
 "La réponse au merci. Littéralement « ne fais pas l'invité » (ne fais pas de manières).",
 "« bù » devient « bú » (ton 2) devant un ton 4. « q » = un « tch » soufflé, langue derrière les dents du bas.",
 "「謝謝！」「不客氣！」", "« Merci ! » « De rien ! »", None),
("請", None, "s'il vous plaît / je vous en prie", "Politesse",
 "Se place au début de la phrase pour demander ou inviter : « 請坐 » (asseyez-vous), « 請進 » (entrez), « 請給我… » (donnez-moi…).",
 "« qǐng » : « tch » soufflé + « ing » nasal. Le ton 3 plonge vers le bas puis remonte à peine.",
 "請給我一杯茶。", "Une tasse de thé, s'il vous plaît.", None),
("對不起", "dui4 bu5 qi3", "pardon / désolé", "Politesse",
 "Pour s'excuser pour de bon (avoir gêné, être en retard). Pour attirer l'attention ou passer devant quelqu'un, on préfère « 不好意思 ».",
 "« bu » au milieu est neutre et très court : « duì-bu-qǐ ». « ui » se dit « oueï ».",
 "對不起，我遲到了。", "Désolé, je suis en retard.", None),
("不好意思", "bu4 hao3 yi4 si5", "excusez-moi / désolé de vous déranger", "Politesse",
 "Le couteau suisse de la politesse taïwanaise : appeler un serveur, se frayer un passage dans le métro, demander son chemin, s'excuser d'un petit dérangement.",
 "Le dernier « si » est neutre, presque un souffle. Dis-le vite et en douceur : « bù-hǎo-yì-si ».",
 "不好意思，請問捷運站在哪裡？", "Excusez-moi, où est la station de métro ?", None),
("再見", None, "au revoir", "Politesse",
 "Littéralement « revoir encore ». Très courant en quittant une boutique. À l'oral entre amis, on entend aussi « bye bye » !",
 "« zài » : le « z » est un « dz » ; « jiàn » : le « j » est un « dj » doux, comme dans « adjectif » sans le « a ».",
 "再見，明天見！", "Au revoir, à demain !", None),
("是", None, "oui / c'est (être)", "Politesse",
 "Le verbe « être » ; il sert aussi de « oui ». Le chinois n'a pas de vrai « oui » : on répète le verbe de la question (« 好 », « 有 », « 是 »…).",
 "« shì » : « sh » avec la langue légèrement recourbée, « i » très ouvert et sourd. Ton 4, sec et descendant.",
 "是的，沒錯。", "Oui, exactement.", None),
("不是", "bu2 shi4", "non / ce n'est pas", "Politesse",
 "« Pas être » : pour nier un fait (« ce n'est pas ça »). Pour refuser quelque chose, on utilisera plutôt « 不要 ».",
 "« bù » devient « bú » devant un ton 4 : « bú shì ».",
 "不是，這不是我的。", "Non, ce n'est pas à moi.", None),
# ---------- Se faire comprendre ----------
("好", None, "bien / d'accord / OK", "Se faire comprendre",
 "Pour dire OK, d'accord, c'est bon. Répondre « 好 ! » à une proposition est déjà une phrase complète. On l'entend aussi en « 好的 » (hǎo de).",
 "Ton 3 : voix qui descend et remonte. « ao » se prononce « aou ».",
 "好，我們走吧！", "D'accord, on y va !", None),
("不要", "bu2 yao4", "non merci / je ne veux pas", "Se faire comprendre",
 "Pour refuser poliment : un vendeur te propose un sac ? « 不要，謝謝 ». Au restaurant, « 不要辣 » = sans piment.",
 "« bú yào » : 2e ton + 4e ton, enchaînés. Garde un ton doux pour ne pas paraître sec.",
 "不要，謝謝。", "Non merci.", None),
("我", None, "je / moi", "Se faire comprendre",
 "Le pronom « je ». Il ne change jamais (pas de conjugaison !). Pluriel : « 我們 » (nous).",
 "« wǒ » : « ouo » avec un ton 3 qui plonge. Pas de « r » ni de « v ».",
 "我想喝茶。", "J'ai envie de boire du thé.", None),
("你", None, "tu / vous", "Se faire comprendre",
 "Le pronom « tu » et « vous » à la fois : le même mot pour tout le monde. Plus formel : « 您 » (nín), rare à Taïwan.",
 "« nǐ » : comme « ni » en français avec un ton 3 (descend-remonte).",
 "你叫什麼名字？", "Comment tu t'appelles ?", None),
("我不懂", None, "je ne comprends pas", "Se faire comprendre",
 "La phrase de survie n°1 ! « 懂 » = comprendre. Tu peux aussi dire « 我聽不懂 » (je ne comprends pas ce que j'entends).",
 "« dǒng » : « d » dur comme « t » doux, « ong » nasal profond. Ton 3.",
 "對不起，我不懂。", "Désolé, je ne comprends pas.", None),
("請再說一次", "qing3 zai4 shuo1 yi2 ci4", "répétez, s'il vous plaît", "Se faire comprendre",
 "« 再 » = encore, « 說 » = dire, « 一次 » = une fois. Une phrase en or pour t'entraîner : on te répétera volontiers.",
 "« yī » devant un ton 4 devient « yí » (ton 2). « shuō » : « chouo » avec langue recourbée.",
 "請再說一次，謝謝。", "Répétez, s'il vous plaît, merci.", None),
("請說慢一點", "qing3 shuo1 man4 yi4 dian3", "parlez plus lentement, s'il vous plaît", "Se faire comprendre",
 "« 慢 » = lent, « 一點 » = un peu. Les Taïwanais sont très bienveillants avec les étrangers qui essaient : ils ralentiront.",
 "« diǎn » : « dien » avec un ton 3. « man » se dit comme « mane » avec un « a » ouvert.",
 "請說慢一點，我在學中文。", "Parlez plus lentement, j'apprends le chinois.", None),
("英文", None, "anglais", "Se faire comprendre",
 "« 英 » = Angleterre, « 文 » = langue écrite. Pour demander : « 你會說英文嗎？ » (Parlez-vous anglais ?). Les jeunes en grandes villes en parlent souvent un peu.",
 "« yīng » : « ine » nasal, ton 1 plat et haut. « wén » : « ouenn », ton 2 montant.",
 "你會說英文嗎？", "Parlez-vous anglais ?", None),
("什麼", "shen2 me5", "quoi / quel", "Se faire comprendre",
 "Le mot pour poser une question « quoi ». En chinois, la place du mot ne change pas : « 這是什麼 ? » = « ceci est quoi ? ».",
 "Le « me » final est neutre : « shén-me », presque « shén-meu ». Dans la rue on entend souvent « shém-ma ».",
 "這是什麼？", "Qu'est-ce que c'est ?", None),
("沒問題", None, "pas de problème", "Se faire comprendre",
 "La réponse rassurante à tout : « Pas de souci ! ». Très courant pour accepter une demande. Peut aussi s'écrire avec « 沒有問題 ».",
 "« méi » = « mé-i » rapide ; « wèn » = « ouenne » descendant ; « tí » = « ti » montant.",
 "沒問題！", "Pas de problème !", None),
# ---------- Chiffres & argent ----------
("一二三", None, "un, deux, trois", "Chiffres & argent",
 "Les trois premiers chiffres, simples à écrire : un trait, deux traits, trois traits ! Ensuite : 四 sì (4), 五 wǔ (5), 六 liù (6), 七 qī (7), 八 bā (8), 九 jiǔ (9), 十 shí (10).",
 "Pour les numéros de téléphone ou de bus, « 一 » se lit souvent « yāo » (pour ne pas le confondre avec 七 « qī »).",
 "一、二、三，開始！", "Un, deux, trois, on commence !", "yī èr sān kāi shǐ"),
("十", None, "dix", "Chiffres & argent",
 "Pour compter jusqu'à 99, c'est logique : 11 = « dix-un » (十一), 20 = « deux-dix » (二十), 35 = « trois-dix-cinq » (三十五). Cent = 一百 (yì bǎi).",
 "« shí » comme « shi » avec la langue recourbée, ton 2 montant. Pense à l'inflexion d'une question.",
 "十點見。", "On se voit à dix heures.", None),
("兩", None, "deux (pour compter des objets)", "Chiffres & argent",
 "Quand on compte des objets ou des personnes, « deux » se dit « 兩 » et non « 二 » : « 兩杯茶 » (deux thés), « 兩個人 » (deux personnes).",
 "« liǎng » : « lia-ng » avec un ton 3 qui descend et remonte.",
 "我要兩杯茶。", "Je voudrais deux thés.", None),
("塊", None, "dollar taïwanais (unité de prix)", "Chiffres & argent",
 "À l'oral, les prix se disent avec « 塊 » : « 一百塊 » = 100 NT$. Sur les étiquettes tu verras plutôt « $ » ou « 元 ». C'est LE mot pour comprendre les prix.",
 "« kuài » : « koua-i », « k » soufflé, ton 4 sec et descendant.",
 "這個一百塊。", "Ça fait cent dollars.", None),
("錢", None, "argent", "Chiffres & argent",
 "L'argent au sens général : « 換錢 » (changer de l'argent), « 沒有錢 » (ne pas avoir d'argent). On le retrouve dans « 多少錢 ».",
 "« qián » : « tchien » avec un « i » court et un ton 2 qui monte.",
 "我要換錢。", "Je voudrais changer de l'argent.", None),
("多少錢", None, "combien ça coûte ?", "Chiffres & argent",
 "La phrase indispensable au marché de nuit. Pointe l'objet du doigt et dis « 多少錢 ? » : la réponse sera presque toujours un nombre suivi de « 塊 ».",
 "« duō-shǎo-qián » : ton 1 haut, ton 3 plongeant, ton 2 montant. Pense à une petite mélodie.",
 "請問，這個多少錢？", "Excusez-moi, combien ça coûte ?", None),
("太貴了", "tai4 gui4 le5", "c'est trop cher", "Chiffres & argent",
 "« 太…了 » = « trop… ». Sur les marchés, pour demander gentiment un petit geste commercial, ajoute : « 可以便宜一點嗎？ ». Dans les magasins aux prix fixes, on ne négocie pas.",
 "« guì » : « gouei » descendant. Le « le » final est neutre et très léger.",
 "太貴了，可以便宜一點嗎？", "C'est trop cher, vous pouvez baisser un peu ?", None),
("便宜", "pian2 yi5", "pas cher / bon marché", "Chiffres & argent",
 "L'inverse de « 貴 ». Le mot est aussi dans la phrase de marchandage : « 便宜一點 » (un peu moins cher).",
 "Attention : le caractère « 便 » se lit « pián » ici (et « biàn » dans « 便利商店 », la supérette). « yi » est neutre.",
 "這家店很便宜。", "Ce magasin est très bon marché.", None),
# ---------- Manger & boire ----------
("吃", None, "manger", "Manger & boire",
 "Verbe central de la culture taïwanaise. Salutation typique : « 你吃飯了嗎？ » (As-tu mangé ?), qui signifie « comment vas-tu ? ». La gastronomie est une religion !",
 "« chī » : « tch » soufflé, langue recourbée, « i » sourd. Ton 1 : haut et plat comme une note tenue.",
 "你吃飯了嗎？", "Tu as mangé ? (façon de dire « ça va ? »)", None),
("喝", None, "boire", "Manger & boire",
 "« 喝茶 » (boire du thé), « 喝水 » (boire de l'eau), « 喝咖啡 » (boire un café). Impossible de passer à côté du thé au lait aux perles.",
 "« hē » : un « h » très aspiré, comme un souffle dans les mains, + « e » entre « eu » et « e ». Ton 1.",
 "我想喝奶茶。", "J'ai envie de boire un thé au lait.", None),
("水", None, "eau", "Manger & boire",
 "L'eau. À Taïwan on boit presque toujours de l'eau tiède ou chaude : « 溫水 » (wēn shuǐ). Pour de l'eau fraîche : « 冰水 » (bīng shuǐ).",
 "« shuǐ » : « chouei » avec langue recourbée, ton 3 plongeant.",
 "請給我一杯水。", "Un verre d'eau, s'il vous plaît.", None),
("茶", None, "thé", "Manger & boire",
 "Taïwan est un pays de thé : oolong de montagne (烏龍茶), thé noir, thé au lait aux perles (珍珠奶茶). Tu verras des boutiques de thé à tous les coins de rue.",
 "« chá » : « tch » soufflé, voyelle « a » ouverte, ton 2 qui monte comme une question.",
 "一杯烏龍茶，謝謝。", "Un oolong, merci.", None),
("飯", None, "riz / repas", "Manger & boire",
 "Le riz cuit, et par extension « le repas ». « 吃飯 » = manger (prendre un repas). Plat à goûter : « 雞肉飯 » (riz au poulet effiloché).",
 "« fàn » : « f » comme en français, « an » ouvert, ton 4 descendant et net.",
 "我想吃雞肉飯。", "J'ai envie de riz au poulet.", None),
("好吃", None, "délicieux / bon (à manger)", "Manger & boire",
 "Le compliment idéal pour un vendeur ou un hôte. Pour un breuvage on dira « 好喝 » (hǎo hē). Un « 很好吃 ! » fait toujours plaisir.",
 "« hǎo chī » : deux tons différents (3 puis 1). Premier ton 3 plongeant, puis ton haut et plat.",
 "這個很好吃！", "C'est très bon !", None),
("我要這個", "wo3 yao4 zhe4 ge5", "je veux celui-ci", "Manger & boire",
 "Pour commander en pointant du doigt : parfait quand le menu est en caractères ! « 這個 » = celui-ci, « 那個 » (nà ge) = celui-là.",
 "« 這 » se prononce « zhè » (ou « zhèi » à l'oral taïwanais). « ge » est neutre et court.",
 "老闆，我要這個，謝謝。", "Patron, je veux ça, merci.", None),
("買單", None, "l'addition, s'il vous plaît", "Manger & boire",
 "En fin de repas : « 老闆，買單 ! » (Patron, l'addition !). On entend aussi « 結帳 » (jié zhàng). Souvent on paie à la caisse en sortant.",
 "« mǎi » : « maï » ton 3 plongeant. « dān » : « dane » ton 1 haut et plat.",
 "老闆，買單！", "Patron, l'addition !", None),
# ---------- Se déplacer ----------
("廁所", None, "toilettes", "Se déplacer",
 "Le mot qu'on cherche toujours au bon moment. Aussi « 洗手間 » (xǐ shǒu jiān) dans les lieux plus chics. Il y en a dans toutes les stations de métro.",
 "« cè » : « ts » + « e » entre « eu » et « e ». « suǒ » : « souo », ton 3.",
 "請問，廁所在哪裡？", "Excusez-moi, où sont les toilettes ?", None),
("哪裡", None, "où", "Se déplacer",
 "Pour demander un lieu : « XX 在哪裡 ? » (« XX est où ? »). Avec « 不好意思 » au début, c'est la phrase de base pour demander son chemin.",
 "« nǎ » : ton 3 plongeant (ne pas confondre avec « nà », « là-bas », ton 4). « lǐ » : ton 3 aussi.",
 "你住在哪裡？", "Où habites-tu ?", None),
("這裡", None, "ici", "Se déplacer",
 "Pour montrer ou indiquer un lieu : « 在這裡 » (c'est ici). L'opposé : « 那裡 » (nà lǐ), là-bas.",
 "« zhè » : « dj » avec langue recourbée + « e » entre « eu » et « e ». Ton 4 net.",
 "這裡有人嗎？", "Il y a quelqu'un ici ? (la place est prise ?)", None),
("捷運", None, "métro (MRT)", "Se déplacer",
 "Le métro de Taipei, Kaohsiung, Taoyuan… Propre, sûr, pas cher. On paie avec la carte EasyCard (悠遊卡). Interdiction de manger et boire dedans, même une gorgée d'eau !",
 "« jié » : « djié » ton 2 montant ; « yùn » : « iun » (« u » prononcé comme en français), ton 4.",
 "我搭捷運去台北車站。", "Je prends le métro pour aller à la gare de Taipei.", None),
("公車", None, "bus", "Se déplacer",
 "Le bus urbain. Pense à demander à ton voisin ou au chauffeur « 這班公車去哪裡 ? ». On annonce l'arrêt en chinois ET en anglais.",
 "« gōng » : « gonng » ton 1 haut ; « chē » : « tch » + « e » ton 1 (chē aussi dans 計程車).",
 "這班公車去哪裡？", "Où va ce bus ?", None),
("計程車", None, "taxi", "Se déplacer",
 "Le taxi jaune. Montre l'adresse en caractères sur ton téléphone au chauffeur. Uber fonctionne aussi.",
 "Trois syllabes : « jì-chéng-chē » ton 4 – 2 – 1. Le « ch » est la même consonne soufflée à chaque fois.",
 "我要叫計程車。", "Je dois appeler un taxi.", None),
("左邊", None, "à gauche / côté gauche", "Se déplacer",
 "Indique la gauche. Utile pour comprendre un itinéraire ou guider un chauffeur : « 左轉 » (zuǒ zhuǎn) = tourner à gauche.",
 "« zuǒ » : « dzouo » ton 3 plongeant ; « biān » : « bien » ton 1 plat.",
 "廁所在左邊。", "Les toilettes sont à gauche.", None),
("右邊", None, "à droite / côté droit", "Se déplacer",
 "Indique la droite : « 右轉 » (yòu zhuǎn) = tourner à droite. Pense « you » en anglais : yòu.",
 "« yòu » : « i-ou » rapide, ton 4 net ; « biān » : ton 1 plat.",
 "便利商店在右邊。", "La supérette est à droite.", None),
("直走", None, "tout droit", "Se déplacer",
 "Le premier mot d'un itinéraire : « 直走，然後右轉 » = tout droit, puis à droite. À retenir pour comprendre le GPS aussi.",
 "« zhí » : ton 2 montant, « zǒu » : ton 3 plongeant. Pense à « dji » et « dzo ».",
 "直走，然後右轉。", "Tout droit, puis tournez à droite.", None),
("停車", None, "se garer / stationner", "Se déplacer",
 "Le mot de la voiture ! « 停車場 » (tíng chē chǎng) = parking. « 這裡可以停車嗎 ? » = « Peut-on se garer ici ? ». Aussi sur les panneaux : « 禁止停車 » = interdiction de stationner.",
 "« tíng » : « tinng » ton 2 montant ; « chē » : ton 1 plat (comme « gōng chē »).",
 "這裡可以停車嗎？", "On peut se garer ici ?", None),
("加油", None, "faire le plein / courage !", "Se déplacer",
 "Double sens ! Pour une voiture : « 加油站 » (jiā yóu zhàn) = station-service. Mais « 加油 ! » crié ou écrit signifie « courage ! », « allez ! » : la phrase d'encouragement par excellence.",
 "« jiā » : « djia » ton 1 haut et plat ; « yóu » : « iou » ton 2 montant.",
 "我要去加油站加油。", "Je vais à la station-service faire le plein.", None),
# ---------- Urgences ----------
("幫幫我", "bang1 bang5 wo3", "aidez-moi", "Urgences",
 "Pour demander de l'aide : « 請幫幫我 » (aidez-moi, s'il vous plaît). Le doublement « 幫幫 » adoucit la demande. Numéros utiles : 110 (police) et 119 (pompiers, ambulance).",
 "« bāng » : « bangue » ton 1 plat ; le second « bang » est neutre et léger.",
 "請幫幫我！", "Aidez-moi, s'il vous plaît !", None),
("醫院", None, "hôpital", "Urgences",
 "L'hôpital. « 醫生 » (yī shēng) = médecin ; « 藥局 » (yào jú) = pharmacie. En cas d'urgence médicale, on appelle le 119.",
 "« yī » : « i » ton 1 haut ; « yuàn » : « iuan » (« u » français), ton 4 net.",
 "請帶我去醫院。", "Emmenez-moi à l'hôpital, s'il vous plaît.", None),
("警察", None, "police / policier", "Urgences",
 "À appeler au 110 en cas de problème. Dans la rue, cherche aussi les postes de police (派出所, pài chū suǒ), très accessibles.",
 "« jǐng » : « djinng » ton 3 plongeant ; « chá » : « tch » soufflé, ton 2 montant.",
 "請叫警察！", "Appelez la police, s'il vous plaît !", None),
]

assert len(W) == 50, len(W)

words = []
for i, (zh, ov, fr, cat, note, pron, ex_zh, ex_fr, exov) in enumerate(W, 1):
    words.append({
        'id': i, 'zh': zh, 'syl': syllables(zh, ov), 'fr': fr, 'cat': cat,
        'note': note, 'pron': pron,
        'ex': {'zh': ex_zh, 'py': exov or ex_py(ex_zh), 'fr': ex_fr},
    })

cats = []
for w in words:
    if w['cat'] not in cats:
        cats.append(w['cat'])

chars = sorted({c for w in words for c in w['zh'] if is_han(c)} | set('好'))
print('mots:', len(words), '| caractères uniques:', len(chars))
print(''.join(chars))
out = 'window.WORDS = ' + json.dumps(words, ensure_ascii=False, indent=1) + ';\nwindow.CATS = ' + json.dumps(cats, ensure_ascii=False) + ';\n'
open('words.js', 'w', encoding='utf-8').write(out)
json.dump(chars, open('tools/chars.json', 'w', encoding='utf-8'), ensure_ascii=False)
for w in words:
    print(w['id'], w['zh'], ' '.join(s['py'] for s in w['syl']), '|', ' '.join(s['zy'] for s in w['syl']), '|', w['ex']['py'])
