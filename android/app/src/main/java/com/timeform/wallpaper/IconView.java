package com.timeform.wallpaper;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.view.View;

/** All visible actions are vector icons; labels are accessibility metadata. */
final class IconView extends View {
    final String icon;
    private final Paint paint = new Paint(3);
    private final Path path = new Path();
    private static final int[][] DOTS={{20,18},{28,18},{17,25},{25,28}};
    int tint = 0xff111111;
    int swatch = Color.TRANSPARENT;
    IconView(Context context, String icon, String description) {
        super(context); this.icon = icon; setContentDescription(description);
        setClickable(true); setFocusable(true); setMinimumWidth(48); setMinimumHeight(48);
    }
    void color(int value) { swatch = value; invalidate(); }
    @Override protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        canvas.save(); float size = Math.min(getWidth(), getHeight());
        canvas.translate((getWidth() - size) / 2, (getHeight() - size) / 2); canvas.scale(size / 48, size / 48);
        paint.setStyle(Paint.Style.FILL); paint.setColor(isSelected() ? 0xffdddddd : isPressed() ? 0xffeeeeee : Color.TRANSPARENT);
        canvas.drawRoundRect(3, 3, 45, 45, 13, 13, paint);
        paint.setColor(tint); paint.setStyle(Paint.Style.STROKE); paint.setStrokeWidth(1.8f);
        paint.setStrokeCap(Paint.Cap.ROUND); paint.setStrokeJoin(Paint.Join.ROUND);
        path.reset();
        switch (icon) {
            case "grid":
                for (int y = 14; y <= 26; y += 12) for (int x = 14; x <= 26; x += 12) canvas.drawRoundRect(x, y, x + 8, y + 8, 2, 2, paint);
                break;
            case "palette":
                canvas.drawCircle(24, 24, 11, paint);
                paint.setStyle(Paint.Style.FILL);
                for (int[] p : DOTS) canvas.drawCircle(p[0],p[1],1.6f,paint);
                canvas.drawCircle(32,28,3.3f,paint); break;
            case "apply":
                canvas.drawRoundRect(15, 10, 33, 38, 3, 3, paint);
                path.moveTo(18,24); path.lineTo(22,28); path.lineTo(30,19); canvas.drawPath(path,paint); break;
            case "shield":
                path.moveTo(24,11); path.lineTo(34,15); path.lineTo(33,26); path.quadTo(30,34,24,37);
                path.quadTo(18,34,15,26); path.lineTo(14,15); path.close(); canvas.drawPath(path,paint);
                path.reset(); path.moveTo(19,23); path.lineTo(23,27); path.lineTo(29,20); canvas.drawPath(path,paint); break;
            case "close": canvas.drawLine(18,18,30,30,paint); canvas.drawLine(30,18,18,30,paint); break;
            case "reset":
                canvas.drawArc(14,14,34,34,-145,295,false,paint);
                path.moveTo(12,14); path.lineTo(13,22); path.lineTo(21,20); canvas.drawPath(path,paint); break;
            case "board":
                paint.setStyle(Paint.Style.FILL); paint.setColor(swatch); canvas.drawRoundRect(14,14,34,34,3,3,paint);
                paint.setStyle(Paint.Style.STROKE); paint.setColor(tint); canvas.drawRoundRect(14,14,34,34,3,3,paint); break;
            case "long": case "short":
                canvas.drawCircle(24,24,12,paint); paint.setStrokeWidth(3.2f); paint.setColor(swatch);
                canvas.drawLine(24,24,24,"long".equals(icon) ? 14 : 18,paint); paint.setColor(tint); paint.setStyle(Paint.Style.FILL); canvas.drawCircle(24,24,1.7f,paint); break;
        }
        canvas.restore();
    }
}
