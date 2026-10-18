package com.timeform.wallpaper;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.view.View;
import org.json.JSONArray;
import org.json.JSONObject;

/** Thumbnail motor poses and geometry come from the shared clock models. */
final class ClockThumbnailView extends View {
    private final JSONObject entry, thumbnail;
    private final Paint paint = new Paint(3);
    ClockThumbnailView(Context context, JSONObject entry) {
        super(context); this.entry = entry; thumbnail = entry.optJSONObject("thumbnail");
        setContentDescription(entry.optString("label")); setClickable(true); setFocusable(true);
    }
    @Override protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        float inset = 5 * getResources().getDisplayMetrics().density;
        paint.setStyle(Paint.Style.FILL); paint.setColor(0xffeeeeee);
        canvas.drawRoundRect(inset,inset,getWidth()-inset,getHeight()-inset,14,14,paint);
        if (isSelected()) { paint.setStyle(Paint.Style.STROKE); paint.setStrokeWidth(3 * getResources().getDisplayMetrics().density);
            paint.setColor(Color.BLACK); canvas.drawRoundRect(inset,inset,getWidth()-inset,getHeight()-inset,14,14,paint); }
        float w = (float) thumbnail.optDouble("width"), h = (float) thumbnail.optDouble("height");
        float scale = Math.min((getWidth()-inset*5)/w,(getHeight()-inset*5)/h);
        canvas.save(); canvas.translate((getWidth()-w*scale)/2,(getHeight()-h*scale)/2); canvas.scale(scale,scale);
        JSONObject colors = entry.optJSONObject("colors"); int board = Color.parseColor(colors.optString("board"));
        paint.setStyle(Paint.Style.FILL); paint.setColor(board);
        if ("circular".equals(entry.optString("category"))) canvas.drawCircle(w/2,h/2,w/2,paint);
        else canvas.drawRect(0,0,w,h,paint);
        JSONArray points = thumbnail.optJSONArray("points"), hands = thumbnail.optJSONArray("hands");
        for (int index = 0; index < points.length(); index++) {
            JSONObject point = points.optJSONObject(index);
            float x = (float)point.optDouble("x"), y = (float)point.optDouble("y"), radius = (float)point.optDouble("radius");
            if (thumbnail.optBoolean("dials")) {
                paint.setStyle(Paint.Style.STROKE); paint.setColor(Color.argb(45,0,0,0)); paint.setStrokeWidth(radius*.04f); canvas.drawCircle(x,y,radius,paint);
            }
            int lane = point.optInt("lane"), motor = point.optInt("i");
            for (int layer=1;layer>=0;layer--) {
                boolean secondary=layer==1;
                JSONObject hand = hands.optJSONObject(motor + (secondary ? lane ^ 1 : lane));
                if (hand.optDouble("opacity") < .02) continue;
                float length = radius * .97f * (float)thumbnail.optDouble(secondary ? "shortLength" : "longLength");
                double angle = hand.optDouble("angle");
                paint.setColor(Color.parseColor(colors.optString(secondary ? "short" : "long")));
                paint.setStyle(Paint.Style.STROKE); paint.setStrokeWidth(radius*.15f); paint.setStrokeCap(Paint.Cap.ROUND);
                canvas.drawLine(x,y,x+(float)Math.cos(angle)*length,y+(float)Math.sin(angle)*length,paint);
            }
        }
        canvas.restore();
    }
}
