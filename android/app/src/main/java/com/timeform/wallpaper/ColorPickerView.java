package com.timeform.wallpaper;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Shader;
import android.view.MotionEvent;
import android.view.View;

/** Saturation/value field and hue strip, with no visible labels or numbers. */
final class ColorPickerView extends View {
    interface Listener { void changed(int color); }
    private final float[] hsv = new float[3];
    private final Paint paint = new Paint(3);
    private Listener listener;
    private boolean changingHue;
    ColorPickerView(Context context, int color, Listener listener) {
        super(context); Color.colorToHSV(color,hsv); this.listener = listener;
        setContentDescription("自由取色，上方调节饱和度和明度，下方调节色相");
        setFocusable(true); setClickable(true);
    }
    void color(int color) { Color.colorToHSV(color,hsv); invalidate(); }
    @Override protected void onDraw(Canvas canvas) {
        float pad = 12 * getResources().getDisplayMetrics().density, right=getWidth()-pad, bottom=getHeight()-pad;
        float fieldBottom=bottom-pad*3, hueTop=fieldBottom+pad;
        paint.setShader(new LinearGradient(pad,0,right,0,Color.WHITE,Color.HSVToColor(new float[]{hsv[0],1,1}),Shader.TileMode.CLAMP));
        canvas.drawRoundRect(pad,pad,right,fieldBottom,8,8,paint);
        paint.setShader(new LinearGradient(0,pad,0,fieldBottom,Color.TRANSPARENT,Color.BLACK,Shader.TileMode.CLAMP));
        canvas.drawRoundRect(pad,pad,right,fieldBottom,8,8,paint);
        int[] spectrum = new int[7]; for(int i=0;i<7;i++) spectrum[i]=Color.HSVToColor(new float[]{i*60,1,1});
        paint.setShader(new LinearGradient(pad,0,right,0,spectrum,null,Shader.TileMode.CLAMP));
        canvas.drawRoundRect(pad,hueTop,right,bottom,8,8,paint); paint.setShader(null);
        paint.setStyle(Paint.Style.STROKE); paint.setStrokeWidth(2*getResources().getDisplayMetrics().density); paint.setColor(Color.WHITE);
        canvas.drawCircle(pad+hsv[1]*(right-pad),pad+(1-hsv[2])*(fieldBottom-pad),pad*.5f,paint);
        canvas.drawCircle(pad+hsv[0]/360*(right-pad),(hueTop+bottom)/2,pad*.5f,paint);
        paint.setStyle(Paint.Style.FILL);
    }
    @Override public boolean onTouchEvent(MotionEvent event) {
        if(event.getAction()==MotionEvent.ACTION_DOWN) { changingHue=event.getY()>getHeight()-36*getResources().getDisplayMetrics().density; getParent().requestDisallowInterceptTouchEvent(true); }
        if(event.getAction()==MotionEvent.ACTION_DOWN || event.getAction()==MotionEvent.ACTION_MOVE) {
            float pad=12*getResources().getDisplayMetrics().density;
            float x=Math.max(0,Math.min(1,(event.getX()-pad)/(getWidth()-pad*2)));
            if(changingHue) hsv[0]=x*359.99f;
            else { hsv[1]=x; hsv[2]=1-Math.max(0,Math.min(1,(event.getY()-pad)/(getHeight()-pad*5))); }
            listener.changed(Color.HSVToColor(hsv)); invalidate(); return true;
        }
        if(event.getAction()==MotionEvent.ACTION_UP) { performClick(); return true; }
        return true;
    }
    @Override public boolean performClick() { super.performClick(); return true; }
}
