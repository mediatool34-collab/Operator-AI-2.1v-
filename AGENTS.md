# Custom Rules & Conventions

This file defines the project-specific rules and definitions of the advertisement optimization engines of this application.

## 1. Definition of "Optimization" (عملية التحسين)

According to the professional Arab Media Buying standard of the project owner, **Campaign Optimization (التحسين)** represents a comprehensive evaluation across four specific pillars:

1. **الجمهور المستهدف (Audience Check)**:
   - Verifying whether target audiences are correct and if the demographics/interests match customer conversion patterns.
   - Example questions: (هل الجمهور صح؟ هل كفاءة الاستهداف تناسب الهدف المحدد؟)

2. **إعدادات المجموعة الإعلانية (Ad Set Settings)**:
   - Confirming whether Ad Set settings, bid strategies, and budget caps are set up correctly.
   - Example questions: (هل إعدادات الـ ad set مظبوطة؟ الميزانية وجدول الصرف ونوع الحدث؟)

3. **ملاءمة المحتوى الإعلاني (Creative Quality Check)**:
   - Assessing if the images, video hooks, and graphics are suitable, or whether a creative change is necessary to boost CTR.
   - Example questions: (هل الكرياتيف والتصميم مناسب للحملة ولا يحتاج يتغير؟)

4. **قوة الحث على اتخاذ وعاء (CTA Verification)**:
   - Reviewing if the Call To Action button is strong and matches user intent properly.
   - Example questions: (هل عبارات الـ CTA وزر اتخاذ القرار قوي ويشجع على التحويل؟)

These four pillars must be integrated as core parameters in any AI recommendation prompts, diagnostic logging checklists, and system interface models.

## 2. Profitability over Vanity Metrics (الربح الصافي مقابل العائد المؤقت)

The success of a campaign **MUST NOT** be measured purely by ROAS (Return On Ad Spend) or total Revenue (المبيعات الإجمالية). A high ROAS can still result in a net loss when factoring in hidden costs.
The AI systems and diagnostic reports must constantly remind the user to calculate the complete picture (الصورة الكاملة), which includes:
- **Product Cost (تكلفة المنتج)**
- **Net Profit Margin (هامش الربح)**
- **Shipping & Returns (مصاريف الشحن والمرتجعات)**
- **Team operations cost (تكلفة الفريق والتشغيل)**

If a campaign generates 200k in revenue with 50k ad spend, the AI must avoid blindly praising the 4X ROAS, and instead insert a cautious reminder to evaluate the real *Net Profit profitability* subtracting all the logistical operations above. Revenue is not the goal unless explicitly requested; net profitability is.
