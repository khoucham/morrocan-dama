/* Arabic for the whole page. The English text stays in the code; this file watches the page and swaps
   known sentences for Arabic when the language is Arabic. Anything it does not know stays English. */
(function () {
  var AR = {
    /* hub and menus */
    'Pick a game': 'اختر لعبة', 'Dama': 'الضامة', 'Moroccan checkers. Online with voice.': 'الضامة المغربية. أونلاين مع الصوت.',
    'Chkobba': 'الشكبة', 'Tunisian cards. 2 or 4 players.': 'ورق تونسي. لاعبان أو أربعة.',
    '📲 Install the app on this phone': '📲 ثبّت التطبيق على هذا الهاتف', '← All games': '← كل الألعاب',
    'Moroccan Dama': 'الضامة المغربية', 'Dama and Chkobba': 'الضامة والشكبة',
    'Capture is compulsory, the longest capture must be taken, and a crowned king flies the whole diagonal.': 'الأكل إجباري، ويجب أخذ أطول سلسلة أكل، والملك المتوَّج يطير على القطر كله.',
    'Play online with voice': 'العب أونلاين مع الصوت', 'Open a private table, send your friend the link, and talk while you play.': 'افتح طاولة خاصة، وأرسل الرابط لصديقك، وتحدثا أثناء اللعب.',
    'Or play on this device': 'أو العب على هذا الجهاز', 'Against computer': 'ضد الكمبيوتر', 'Two players': 'لاعبان',
    'Computer level': 'مستوى الكمبيوتر', 'Easy': 'سهل', 'Medium': 'متوسط', 'Hard': 'صعب', 'Normal': 'عادي', 'Strong': 'قوي',
    'Who moves first': 'من يبدأ', 'You': 'أنت', 'Computer': 'الكمبيوتر', 'New Game': 'لعبة جديدة', 'Puzzles': 'ألغاز', 'Rules': 'القواعد',
    'Sound: on': 'الصوت: مفعّل', 'Sound: off': 'الصوت: متوقف',
    'Play online with friends': 'العب أونلاين مع الأصدقاء', 'Online Chkobba tables come next. For now you can play against the computer.': 'طاولات الشكبة أونلاين قادمة قريبًا. الآن يمكنك اللعب ضد الكمبيوتر.',
    'Players': 'اللاعبون', '2 players': 'لاعبان', '4 players, teams': '4 لاعبين، فريقان', 'Play to': 'العب حتى', '11 points': '11 نقطة', '21 points': '21 نقطة',
    'Play against computer': 'العب ضد الكمبيوتر',
    /* table / invite */
    'left': 'غادر', 'Invite your friend': 'ادعُ صديقك', 'Send your friend this link. They tap it and they are at the table. No sign-up.': 'أرسل هذا الرابط لصديقك. يضغط عليه فيصبح على الطاولة. بدون تسجيل.',
    'Copy link': 'انسخ الرابط', 'Send on WhatsApp': 'أرسل عبر واتساب', 'Share': 'مشاركة', 'Want friends to watch?': 'تريد أن يشاهد أصدقاؤك؟',
    'They join muted, and you choose who can talk.': 'ينضمون بدون صوت، وأنت تختار من يتكلم.', 'Copy watch link': 'انسخ رابط المشاهدة', 'WhatsApp': 'واتساب',
    'Your friend offers a draw.': 'صديقك يعرض التعادل.', 'Accept': 'قبول', 'Decline': 'رفض',
    'Voice call': 'مكالمة صوتية', 'Join voice': 'انضم للصوت', 'Ask to speak': 'اطلب الكلام', 'Tap to hear': 'اضغط للاستماع', 'Leave voice': 'غادر الصوت',
    'Chat': 'الدردشة', 'Send': 'إرسال', 'Show invite link': 'أظهر رابط الدعوة', 'Hint': 'تلميح', 'Try again': 'حاول مرة أخرى', 'Show answer': 'أظهر الحل',
    'Next puzzle': 'اللغز التالي', 'All puzzles': 'كل الألغاز', 'Undo move': 'تراجع عن النقلة', 'Restart': 'إعادة', 'Offer draw': 'اعرض التعادل', 'Resign': 'استسلام',
    'Main menu': 'القائمة الرئيسية', 'Players agree a draw': 'اتفق اللاعبان على التعادل', 'Moves': 'النقلات', 'Undo': 'تراجع', '← Menu': '← القائمة',
    'Empty': 'فارغ', '1 seated · 1 to go': 'جالس 1 · ينقص 1', '2 seated · ready': 'جالسان · جاهزان', 'Send the code on WhatsApp': 'أرسل الرمز عبر واتساب',
    'Or tell them the code': 'أو أخبرهم بالرمز', 'What can I do?': 'ماذا أفعل؟', 'Invite watchers': 'ادعُ مشاهدين',
    'Send the link on WhatsApp. They tap it and they are at the table, with no sign-up. Or give them the code to type under “Have a code?”. Voice and chat start when they arrive.': 'أرسل الرابط عبر واتساب. يضغطون عليه فيصبحون على الطاولة بدون تسجيل. أو أعطهم الرمز ليكتبوه تحت «عندك رمز؟». يبدأ الصوت والدردشة عندما يصلون.',
    'Moroccan 8×8 · no clock': 'مغربية 8×8 · بدون ساعة',
    'Leave the table?': 'مغادرة الطاولة؟', 'Back to the menu?': 'العودة إلى القائمة؟', 'Your friend will see that you left.': 'سيرى صديقك أنك غادرت.', 'The game is over.': 'انتهت اللعبة.', 'The game on this device will be lost.': 'ستضيع اللعبة على هذا الجهاز.', 'Stay': 'ابقَ', 'Leave': 'غادر',
    'Yallah, your move!': 'يالله، دورك!', 'Good move!': 'نقلة جيدة!', 'Nice capture!': 'أكلة حلوة!', 'Crowned!': 'توَّجت!', 'Oops, my mistake': 'آه، غلطتي', 'Give me a second': 'أمهلني لحظة', 'Good game!': 'لعبة جميلة!', 'Rematch?': 'نعاود؟', 'Chat and reactions': 'الدردشة وردود الفعل', 'Quick messages': 'رسائل سريعة',
    'Chkobba!': 'شكبة!', '7aya!': 'الحاية!', 'Choose a card': 'اختر ورقة',
    'Open a private table and send your friend the link. Tap the microphone to talk while you play. Friends can also watch, and you choose who can talk.': 'افتح طاولة خاصة وأرسل الرابط لصديقك. اضغط على الميكروفون لتتكلم أثناء اللعب. يمكن للأصدقاء أيضًا المشاهدة، وأنت تختار من يتكلم.',
    'Your name': 'اسمك', 'Game clock (for a table you create)': 'ساعة اللعب (للطاولة التي تنشئها)', 'No clock': 'بدون ساعة', '3 minutes each': '3 دقائق لكل لاعب',
    '5 minutes each': '5 دقائق لكل لاعب', '10 minutes each': '10 دقائق لكل لاعب', 'Create table': 'أنشئ طاولة', 'Have a code?': 'عندك رمز؟', 'Join table': 'انضم للطاولة',
    'Watch': 'شاهد', 'Cancel': 'إلغاء', 'Tactic puzzles': 'ألغاز تكتيكية',
    'Ivory to move. Find the move that wins material by force. Often you have to give a stone first.': 'دور العاجي. جد النقلة التي تكسب بها حجارة بالقوة. غالبًا عليك أن تضحّي بحجر أولًا.',
    'Close': 'إغلاق', 'Joining table…': 'جارٍ الانضمام إلى الطاولة…',
    /* chkobba dialogs */
    'You cut the deck': 'أنت تقطع الورق', 'This is the top card. Keep it as your first card, or throw it on the table.': 'هذه هي الورقة العليا. احتفظ بها كأول ورقة لك، أو ارمِها على الطاولة.',
    'Keep it': 'احتفظ بها', 'Throw it': 'ارمِها', 'Deal finished': 'انتهى التوزيع', 'Next deal': 'التوزيع التالي',
    'How Chkobba is played': 'كيف تُلعب الشكبة', '40 cards: Ace to 7, then Queen = 8, Jack = 9, King = 10. 2 players, or 4 in two teams.': '40 ورقة: من الآس إلى 7، ثم الملكة = 8، الولد = 9، الملك = 10. لاعبان، أو 4 في فريقين.',
    'The deal.': 'التوزيع.', 'The player before the dealer cuts, looks at the top card and keeps it or throws it on the table. The dealer then gives 3 cards to each player and puts 4 on the table. Later rounds are 3 cards each with nothing added to the table.': 'اللاعب الذي قبل الموزّع يقطع الورق وينظر إلى الورقة العليا ويحتفظ بها أو يرميها على الطاولة. ثم يوزّع الموزّع 3 أوراق لكل لاعب ويضع 4 على الطاولة. الجولات التالية 3 أوراق لكل لاعب دون إضافة شيء إلى الطاولة.',
    'Your turn.': 'دورك.', 'Play one card. If a card of the same value is on the table you must take it. Otherwise you may take any cards that add up to your card. If nothing can be taken the card stays on the table.': 'العب ورقة واحدة. إذا كانت على الطاولة ورقة بنفس القيمة فيجب أخذها. وإلا يمكنك أخذ أي أوراق يساوي مجموعها ورقتك. وإذا لم يمكن أخذ شيء تبقى الورقة على الطاولة.',
    'Chkobba.': 'الشكبة.', 'Clearing the table scores 1 point, except on the very last play of the deal.': 'تفريغ الطاولة يعطي نقطة واحدة، إلا في آخر لعبة من التوزيع.',
    'End of the deal.': 'نهاية التوزيع.', 'The last player to take cards also takes what is left on the table.': 'آخر لاعب أخذ أوراقًا يأخذ أيضًا ما تبقى على الطاولة.',
    'Points.': 'النقاط.', 'Most cards, most diamonds, most 7s (then most 6s if tied), the 7 of diamonds, and each Chkobba.': 'أكثر أوراق، أكثر ديناري، أكثر سبعات (ثم أكثر ستات عند التعادل)، سبعة الديناري، وكل شكبة.',
    'Winning.': 'الفوز.', 'The first side to reach the target (11 or 21) wins.': 'أول فريق يصل إلى الهدف (11 أو 21) يفوز.', 'Got it': 'فهمت',
    'How Moroccan Dama is played': 'كيف تُلعب الضامة المغربية', '8×8 board, dark squares only, 12 stones each on the first three rows.': 'رقعة 8×8، المربعات الداكنة فقط، 12 حجرًا لكل لاعب على أول ثلاثة صفوف.',
    'Moving.': 'الحركة.', 'A normal stone steps one square diagonally forward. Never backward, never straight.': 'الحجر العادي يتقدم مربعًا واحدًا بشكل قطري إلى الأمام. لا يرجع إلى الوراء ولا يتحرك بشكل مستقيم.',
    'Capturing.': 'الأكل.', 'Jump an enemy stone diagonally forward onto the empty square right behind it. Normal stones cannot capture backward. Captured stones leave the board.': 'اقفز فوق حجر الخصم قطريًا إلى الأمام إلى المربع الفارغ خلفه مباشرة. الحجارة العادية لا تأكل إلى الخلف. الحجارة المأكولة تخرج من الرقعة.',
    'Compulsory.': 'إجباري.', 'If you can capture you must, and you must choose a sequence that takes the greatest number of stones. If several sequences tie, pick any.': 'إذا استطعت الأكل فيجب عليك ذلك، ويجب اختيار السلسلة التي تأكل أكبر عدد من الحجارة. وإذا تساوت عدة سلاسل فاختر أيًّا منها.',
    'Multiple captures.': 'الأكل المتعدد.', 'The same stone keeps capturing while it can. You cannot switch stones midway. Click each landing square in turn.': 'يستمر نفس الحجر في الأكل ما دام يستطيع. لا يمكن تغيير الحجر في المنتصف. اضغط على كل مربع هبوط بالترتيب.',
    'Kings (Dama).': 'الملوك (الضامة).', 'A stone reaching the far row is crowned. Kings slide any distance diagonally in all four directions.': 'الحجر الذي يصل إلى الصف الأخير يتوَّج. الملك ينزلق أي مسافة قطريًا في الاتجاهات الأربعة.',
    'King captures.': 'أكل الملك.', 'A king captures from a distance: it jumps one enemy stone and lands on any empty square beyond it. It cannot jump two stones in a row, or its own stones. In a multiple capture it may turn onto another diagonal, but it cannot go back the way it came along the same line.': 'الملك يأكل من بعيد: يقفز فوق حجر واحد للخصم ويهبط على أي مربع فارغ بعده. لا يستطيع القفز فوق حجرين متتاليين ولا فوق حجارته. في الأكل المتعدد يمكنه الانعطاف إلى قطر آخر، لكنه لا يعود في نفس الخط الذي جاء منه.',
    'Crowning ends the turn.': 'التتويج ينهي الدور.', 'A stone crowned during a capture stops there. The new king cannot continue capturing that turn.': 'الحجر الذي يتوَّج أثناء الأكل يتوقف هناك. الملك الجديد لا يكمل الأكل في ذلك الدور.',
    ' You win when the opponent has no stones left, or has stones but no legal move.': 'تفوز عندما لا يبقى للخصم حجارة، أو تبقى له حجارة دون نقلة ممكنة.',
    'You win when the opponent has no stones left, or has stones but no legal move.': 'تفوز عندما لا يبقى للخصم حجارة، أو تبقى له حجارة دون نقلة ممكنة.',
    'moves played': 'نقلة', 'Ivory left': 'العاجي المتبقي', 'Ruby left': 'الياقوتي المتبقي', 'Play again': 'العب مرة أخرى',
    'Dama board': 'رقعة الضامة', 'Table code': 'رمز الطاولة', 'Invite link': 'رابط الدعوة', 'Watch link': 'رابط المشاهدة', 'Tap to hear everyone': 'اضغط لسماع الجميع',
    'Table chat': 'دردشة الطاولة', 'Quick reactions': 'ردود سريعة', 'Say something…': 'قل شيئًا…', 'Chat message': 'رسالة', 'Move list': 'قائمة النقلات',
    'Table controls': 'أدوات الطاولة', 'Microphone': 'الميكروفون', 'Who is at the table': 'من على الطاولة', 'Message…': 'رسالة…', 'Reactions': 'ردود الفعل', 'Menu': 'القائمة',
    'Cards on the table': 'الأوراق على الطاولة', 'Your cards': 'أوراقك', 'Name your friend will see': 'الاسم الذي سيراه صديقك',
    /* messages */
    'Put it down': 'ضع الورقة', 'Take': 'خذ', 'Choose cards to take': 'اختر الأوراق التي ستأخذها', 'Last round': 'الجولة الأخيرة',
    'Most cards': 'أكثر أوراق', 'Most diamonds': 'أكثر ديناري', 'Most sevens': 'أكثر سبعات', '7 of diamonds': 'سبعة الديناري',
    'Cards': 'الأوراق', 'Diamonds': 'الديناري', 'Sevens': 'السبعات', 'Sixes': 'الستات', 'No points this deal': 'لا نقاط في هذا التوزيع',
    'cards': 'ورقة', 'sevens': 'سبعات', 'Us': 'نحن', 'Them': 'هم', 'You & Salma': 'أنت وسلمى', 'Karim & Youssef': 'كريم ويوسف',
    'You win!': 'فزت!', 'Your team wins!': 'فريقك يفوز!', 'Computer wins': 'الكمبيوتر يفوز', 'They win': 'هم يفوزون', 'The computer wins': 'الكمبيوتر يفوز', 'The computer wins.': 'الكمبيوتر يفوز.',
    'You win': 'فزت', 'You win.': 'فزت.', 'Tap again to quit': 'اضغط مرة أخرى للخروج', 'Tap again to resign': 'اضغط مرة أخرى للاستسلام', 'Tap again to leave': 'اضغط مرة أخرى للمغادرة',
    'Leave table': 'غادر الطاولة', 'Link copied.': 'تم نسخ الرابط.', 'Press copy on your keyboard to copy the link.': 'اضغط نسخ على لوحة المفاتيح لنسخ الرابط.',
    'Something went wrong.': 'حدث خطأ ما.', 'That move was not accepted.': 'لم تُقبل هذه النقلة.', 'Cannot reach the game server. Check your connection and try again.': 'لا يمكن الوصول إلى الخادم. تحقق من الاتصال وحاول مرة أخرى.',
    'Could not join that table.': 'تعذّر الانضمام إلى تلك الطاولة.', 'Enter the 5-character table code.': 'أدخل رمز الطاولة المكوّن من 5 رموز.', 'Getting you to the table.': 'جارٍ نقلك إلى الطاولة.',
    'This table has closed.': 'هذه الطاولة أُغلقت.', 'The table was closed.': 'تم إغلاق الطاولة.', 'Waiting for friend': 'بانتظار الصديق', 'Waiting for the players': 'بانتظار اللاعبين', 'Waiting for the players.': 'بانتظار اللاعبين.',
    'Waiting for your friend': 'بانتظار صديقك', 'Send them the table code below.': 'أرسل لهم رمز الطاولة أدناه.', 'Waiting for them to come back.': 'بانتظار عودتهم.',
    'You are watching.': 'أنت تشاهد.', 'You are watching. The game starts when both players are here.': 'أنت تشاهد. تبدأ اللعبة عندما يحضر اللاعبان.',
    'Both seats are taken, so you will watch the game.': 'المقعدان محجوزان، لذلك ستشاهد اللعبة.', 'You will watch the game.': 'ستشاهد اللعبة.',
    'Your friend left the table. Send the link to invite someone else.': 'غادر صديقك الطاولة. أرسل الرابط لدعوة شخص آخر.', 'Your game is saved. It will carry on when you are back.': 'لعبتك محفوظة وستكمل عند عودتك.',
    'You will see the game again in a moment.': 'سترى اللعبة بعد لحظات.', 'Both players agreed to a draw.': 'اتفق اللاعبان على التعادل.', 'Draw agreed.': 'تم الاتفاق على التعادل.',
    'The opponent has no stones left.': 'لم يبقَ للخصم حجارة.', 'The opponent has no legal move.': 'ليس للخصم نقلة ممكنة.', 'The opponent has stones left but no legal move.': 'للخصم حجارة لكن بلا نقلة ممكنة.',
    'The opponent resigned.': 'استسلم الخصم.', 'You resigned.': 'استسلمت.', 'You ran out of time.': 'انتهى وقتك.',
    'The players can play a rematch. You will see it here.': 'يمكن للاعبين لعب مباراة إعادة. سترى ذلك هنا.', 'Rematch (swap colours)': 'إعادة المباراة (تبديل الألوان)',
    'Either player can ask for a rematch. Colours swap so the other player moves first.': 'يمكن لأي لاعب طلب إعادة المباراة. تتبدل الألوان فيبدأ اللاعب الآخر.', 'New game. Colours have swapped.': 'لعبة جديدة. تبدلت الألوان.',
    'Starting…': 'جارٍ البدء…', 'Hand raised': 'تم رفع اليد', 'Muted by host': 'كتمه المضيف', 'Invite watchers': 'ادعُ مشاهدين',
    'Your mic is live.': 'ميكروفونك يعمل.', 'Your mic is muted.': 'ميكروفونك مكتوم.', 'Your mic is ready.': 'ميكروفونك جاهز.',
    'Tap the microphone so they can hear you.': 'اضغط على الميكروفون ليسمعوك.', 'Tap the microphone when you are ready.': 'اضغط على الميكروفون عندما تكون جاهزًا.',
    'The host has muted you. Tap the hand to ask to speak.': 'كتمك المضيف. اضغط على اليد لتطلب الكلام.', 'You joined muted. Tap the hand to ask to speak.': 'انضممت بدون صوت. اضغط على اليد لتطلب الكلام.',
    'No microphone could be opened.': 'تعذّر فتح الميكروفون.', 'The microphone is blocked. Allow it in your browser settings, then tap the mic again.': 'الميكروفون محظور. اسمح به من إعدادات المتصفح ثم اضغط عليه مرة أخرى.',
    'Voice is not supported in this browser.': 'الصوت غير مدعوم في هذا المتصفح.', 'Voice needs a secure (https) connection and a browser with microphone support.': 'الصوت يحتاج اتصالًا آمنًا (https) ومتصفحًا يدعم الميكروفون.',
    'Voice starts when your friend is at the table.': 'يبدأ الصوت عندما يكون صديقك على الطاولة.', 'No messages yet.': 'لا توجد رسائل بعد.',
    'Your move.': 'دورك.', 'Capture is compulsory, so they have no choice.': 'الأكل إجباري، فلا خيار لهم.', 'Capture is compulsory. Choose the longest capture.': 'الأكل إجباري. اختر أطول سلسلة أكل.',
    'Capture is compulsory. The glowing stone has a capture.': 'الأكل إجباري. الحجر المتوهج عنده أكل.', 'Choose a highlighted square.': 'اختر مربعًا مضيئًا.', 'Choose a ringed stone.': 'اختر حجرًا محاطًا بدائرة.',
    'Looking for a good move…': 'أبحث عن نقلة جيدة…', 'Now take them!': 'الآن خذها!', 'The glowing stone is the one to move. Where should it go?': 'الحجر المتوهج هو الذي يتحرك. إلى أين يذهب؟', 'Try the glowing stone.': 'جرّب الحجر المتوهج.',
    'Not quite. Look for a move that forces them to capture, then take more back.': 'ليس تمامًا. ابحث عن نقلة تُجبرهم على الأكل، ثم خذ أكثر في المقابل.',
    'Find the move that wins material by force. You may need to give a stone first.': 'جد النقلة التي تكسب بها حجارة بالقوة. قد تحتاج لتضحية بحجر أولًا.',
    'Ivory left ': 'العاجي المتبقي', 'your stones left': 'حجارتك المتبقية', 'computer stones left': 'حجارة الكمبيوتر المتبقية', 'Player 1': 'اللاعب 1', 'Player 2': 'اللاعب 2',
    'Ivory': 'العاجي', 'Ruby': 'الياقوتي', 'one person': 'شخص واحد',
    'In Chrome or Edge, click the install icon at the right end of the address bar.': 'في Chrome أو Edge اضغط على أيقونة التثبيت في نهاية شريط العنوان.',
    'Tap the Share button (the square with an arrow) at the bottom of Safari, scroll down and tap “Add to Home Screen”.': 'اضغط على زر المشاركة (المربع والسهم) أسفل Safari، ثم مرّر للأسفل واضغط «إضافة إلى الشاشة الرئيسية».',
    'Tap the ⋮ menu in Chrome, then “Install app” (or “Add to Home screen”).': 'اضغط على قائمة ⋮ في Chrome ثم «تثبيت التطبيق» (أو «إضافة إلى الشاشة الرئيسية»).',
    'You opened this inside another app. Tap the compass or ⋯ button and choose “Open in Safari”. Then tap Share and “Add to Home Screen”.': 'فتحت هذا داخل تطبيق آخر. اضغط على البوصلة أو زر ⋯ واختر «فتح في Safari». ثم اضغط مشاركة و«إضافة إلى الشاشة الرئيسية».',
    'You opened this inside another app. Tap ⋮ and choose “Open in Chrome”. Then tap ⋮ again and choose “Install app”.': 'فتحت هذا داخل تطبيق آخر. اضغط ⋮ واختر «فتح في Chrome». ثم اضغط ⋮ مرة أخرى واختر «تثبيت التطبيق».',
    'Computer level ': 'مستوى الكمبيوتر', 'Name': 'الاسم'
  };
  var NAME = { 'You': 'أنت', 'Computer': 'الكمبيوتر', 'Karim': 'كريم', 'Salma': 'سلمى', 'Youssef': 'يوسف', 'The computer': 'الكمبيوتر' };
  var FEM = { 'Salma': 1 };
  function nm(x) { return NAME[x] || x; }
  function card(s) { return '\u2066' + s.replace(/\b(King|Queen|Jack|Ace)\b/g, function (w) { return { King: 'ملك', Queen: 'ملكة', Jack: 'ولد', Ace: 'آس' }[w]; }) + '\u2069'; }
  function verb(who, you, f, m) { return who === 'You' ? you : FEM[who] ? f : m; }
  var PAT = [
    [/^Moroccan 8×8 · (\d+) min each$/, function (m) { return 'مغربية 8×8 · ' + m[1] + ' دقائق لكل لاعب'; }],
    [/^to (\d+)$/, function (m) { return 'إلى ' + m[1]; }],
    [/^Deck (\d+)$/, function (m) { return 'الورق ' + m[1]; }],
    [/^(.+?) took with (.+?)( — Chkobba!)?\.$/, function (m) { return nm(m[1]) + ' ' + verb(m[1], 'أخذتَ', 'أخذت', 'أخذ') + ' بـ ' + card(m[2]) + (m[3] ? ' — شكبة!' : '.') + (/New cards/.test(m[0]) ? '' : ''); }],
    [/^(.+?) puts? down (.+?)\.$/, function (m) { return nm(m[1]) + ' ' + verb(m[1], 'وضعتَ', 'وضعت', 'وضع') + ' ' + card(m[2]) + ' على الطاولة.'; }],
    [/^(.+?) kept the card\. (\d+) cards on the table\.$/, function (m) { return nm(m[1]) + ' ' + verb(m[1], 'احتفظتَ', 'احتفظت', 'احتفظ') + ' بالورقة. ' + m[2] + ' أوراق على الطاولة.'; }],
    [/^(.+?) threw the card on the table\. (\d+) cards on the table\.$/, function (m) { return nm(m[1]) + ' ' + verb(m[1], 'رميتَ', 'رمت', 'رمى') + ' الورقة على الطاولة. ' + m[2] + ' أوراق على الطاولة.'; }],
    [/^(.+?) cuts? the deck…$/, function (m) { return nm(m[1]) + ' ' + verb(m[1], 'تقطع', 'تقطع', 'يقطع') + ' الورق…'; }],
    [/^(.+?) cut the deck…$/, function (m) { return nm(m[1]) + ' ' + verb(m[1], 'قطعتَ', 'قطعت', 'قطع') + ' الورق…'; }],
    [/^(.+?) took with (.+?)( — Chkobba!)? New cards\.$/, function (m) { return nm(m[1]) + ' أخذ بـ ' + card(m[2]) + ' — ورق جديد.'; }],
    [/^Waiting for (.+?)(…|\.)?$/, function (m) { return 'بانتظار ' + nm(m[1]) + (m[2] || ''); }],
    [/^Draw offered\. Waiting for (.+)\.$/, function (m) { return 'تم عرض التعادل. بانتظار ' + nm(m[1]) + '.'; }],
    [/^(.+) declined the draw\.$/, function (m) { return nm(m[1]) + ' رفض التعادل.'; }],
    [/^(.+) joined the table\.$/, function (m) { return nm(m[1]) + ' انضم إلى الطاولة.'; }],
    [/^(.+) ran out of time\.$/, function (m) { return 'انتهى وقت ' + nm(m[1]) + '.'; }],
    [/^(.+) wants a rematch\.$/, function (m) { return nm(m[1]) + ' يريد إعادة المباراة.'; }],
    [/^(.+) disconnected\.$/, function (m) { return nm(m[1]) + ' انقطع اتصاله.'; }],
    [/^(Ivory|Ruby) left$/, function (m) { return (m[1] === 'Ivory' ? 'العاجي' : 'الياقوتي') + ' المتبقي'; }],
    [/^Joining table (\w+)…$/, function (m) { return 'جارٍ الانضمام إلى الطاولة ' + m[1] + '…'; }],
    [/^(\d+) of (\d+) solved\. They get harder as you go\.$/, function (m) { return 'تم حل ' + m[1] + ' من ' + m[2] + '. تزداد صعوبة كلما تقدمت.'; }],
    [/^You gave up (\d+) stones? and won (\d+)\.$/, function (m) { return 'ضحّيت بـ ' + m[1] + ' وربحت ' + m[2] + '.'; }],
    [/^The answer is (.+)\. Play it, then take back more\.$/, function (m) { return 'الحل هو ' + m[1] + '. العبه ثم خذ المزيد.'; }],
    [/^Puzzle (\d+)(, solved)?$/, function (m) { return 'اللغز ' + m[1] + (m[2] ? '، تم حله' : ''); }],
    [/^, can move$/, function () { return '، يمكنه التحرك'; }],
    [/^(\d+) cards$/, function (m) { return m[1] + ' ورقة'; }]
  ];
  var WORDS = [[/\bIvory\b/g, 'العاجي'], [/\bRuby\b/g, 'الياقوتي'], [/\(you\)/g, '(أنت)'], [/\bPlayer 1\b/g, 'اللاعب 1'], [/\bPlayer 2\b/g, 'اللاعب 2']];

  function tr(text) {
    var lead = text.match(/^\s*/)[0], trail = text.match(/\s*$/)[0], core = text.trim();
    if (!core) return null;
    var out = AR[core];
    if (out == null) {
      for (var i = 0; i < PAT.length; i++) { var m = PAT[i][0].exec(core); if (m) { var r = PAT[i][1](m); if (r) { out = r; break; } } }
    }
    if (out == null && /\b(Ivory|Ruby|Player [12])\b/.test(core)) {            // "Ivory · Karim (you)" and the like
      var o = core; WORDS.forEach(function (w) { o = o.replace(w[0], w[1]); }); if (o !== core) out = o;
    }
    return out == null ? null : lead + out + trail;
  }

  var ATTR = ['placeholder', 'aria-label', 'title', 'alt'];
  var orig = new WeakMap(), lang = 'en', busy = false, obs;
  function skip(n) { for (var e = n.nodeType === 1 ? n : n.parentNode; e && e.nodeType === 1; e = e.parentNode) { if (e.hasAttribute && e.hasAttribute('data-no-i18n')) return true; var tg = e.tagName; if (tg === 'SCRIPT' || tg === 'STYLE') return true; } return false; }
  function doText(n) {
    if (skip(n)) return;
    var prev = orig.get(n), cur = n.nodeValue;
    if (prev && prev.ar === cur) return;                       // our own translation, leave it
    var t = tr(cur);
    if (t != null && t !== cur) { orig.set(n, { en: cur, ar: t }); n.nodeValue = t; }
    else if (prev) orig.delete(n);
  }
  function doAttrs(e) {
    if (skip(e)) return;
    ATTR.forEach(function (a) {
      var v = e.getAttribute && e.getAttribute(a); if (!v) return;
      var key = '__en_' + a, saved = e[key];
      if (saved && saved.ar === v) return;
      var t = tr(v);
      if (t != null && t !== v) { e[key] = { en: v, ar: t }; e.setAttribute(a, t); } else if (saved) delete e[key];
    });
  }
  function walk(root) {
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1) return;
    doAttrs(root);
    for (var c = root.firstChild; c; c = c.nextSibling) walk(c);
  }
  function restore(root) {
    if (root.nodeType === 3) { var o = orig.get(root); if (o && root.nodeValue === o.ar) root.nodeValue = o.en; orig.delete(root); return; }
    if (root.nodeType !== 1) return;
    ATTR.forEach(function (a) { var s = root['__en_' + a]; if (s) { if (root.getAttribute(a) === s.ar) root.setAttribute(a, s.en); delete root['__en_' + a]; } });
    for (var c = root.firstChild; c; c = c.nextSibling) restore(c);
  }
  function onMut(list) {
    if (lang !== 'ar' || busy) return;
    busy = true; obs.disconnect();
    try {
      list.forEach(function (m) {
        if (m.type === 'characterData') doText(m.target);
        else if (m.type === 'attributes') doAttrs(m.target);
        else m.addedNodes.forEach(walk);
      });
    } finally { busy = false; watch(); }
  }
  function watch() { obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTR }); }
  function btnLabel() { var b = document.getElementById('lang-btn'); if (b) b.textContent = lang === 'ar' ? 'English' : 'العربية'; }
  function set(l, save) {
    lang = l === 'ar' ? 'ar' : 'en';
    var de = document.documentElement;
    de.lang = lang; de.dir = lang === 'ar' ? 'rtl' : 'ltr';
    if (save) { try { localStorage.setItem('dama-lang', lang); } catch (e) {} }
    busy = true; obs.disconnect();
    try { if (lang === 'ar') walk(document.body); else restore(document.body); } finally { busy = false; }
    watch(); btnLabel();
    document.title = lang === 'ar' ? 'الضامة والشكبة' : 'Dama and Chkobba';
  }
  obs = new MutationObserver(onMut);
  var b = document.getElementById('lang-btn');
  if (b) b.addEventListener('click', function () { set(lang === 'ar' ? 'en' : 'ar', true); });
  var saved = 'en'; try { saved = localStorage.getItem('dama-lang') || 'en'; } catch (e) {}
  watch(); set(saved, false);
  window.__i18n = { set: set, tr: tr, get lang() { return lang; } };
})();
