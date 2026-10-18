package com.timeform.wallpaper;

import android.app.Presentation;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.os.Bundle;
import android.service.wallpaper.WallpaperService;
import android.util.Log;
import android.view.SurfaceHolder;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;

/** Each system preview/home-screen engine owns an independent rendering display. */
public final class ClockWallpaperService extends WallpaperService {
    @Override public Engine onCreateEngine() { return new ClockEngine(); }

    private final class ClockEngine extends Engine {
        private VirtualDisplay display;
        private Presentation presentation;
        private ClockWebView clock;
        private int width, height;
        private boolean visible;

        @Override public void onCreate(SurfaceHolder holder) {
            super.onCreate(holder);
            setTouchEventsEnabled(false);
            setOffsetNotificationsEnabled(false);
        }
        @Override public void onSurfaceChanged(SurfaceHolder holder, int format, int w, int h) {
            super.onSurfaceChanged(holder, format, w, h);
            if (w < 1 || h < 1) return;
            if (display != null && width == w && height == h) { display.setSurface(holder.getSurface()); return; }
            releaseRenderer();
            width = w; height = h;
            try {
                DisplayManager manager = (DisplayManager) getSystemService(Context.DISPLAY_SERVICE);
                display = manager.createVirtualDisplay("TIMEFORM", w, h, getResources().getDisplayMetrics().densityDpi,
                    holder.getSurface(), DisplayManager.VIRTUAL_DISPLAY_FLAG_OWN_CONTENT_ONLY | DisplayManager.VIRTUAL_DISPLAY_FLAG_PRESENTATION);
                if (display == null) throw new IllegalStateException("Virtual display unavailable");
                presentation = new Presentation(ClockWallpaperService.this, display.getDisplay()) {
                    @Override protected void onCreate(Bundle state) {
                        super.onCreate(state);
                        Window window = getWindow();
                        window.setFlags(WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED | WindowManager.LayoutParams.FLAG_FULLSCREEN,
                            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED | WindowManager.LayoutParams.FLAG_FULLSCREEN);
                        window.getDecorView().setSystemUiVisibility(android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | android.view.View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            | android.view.View.SYSTEM_UI_FLAG_FULLSCREEN | android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
                        clock = new ClockWebView(getContext());
                        setContentView(clock, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
                        window.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
                        clock.setSuspended(!visible);
                    }
                };
                presentation.show();
                Log.i("TIMEFORM", "Wallpaper renderer ready " + w + "x" + h + " preview=" + isPreview());
            } catch (RuntimeException error) {
                Log.e("TIMEFORM", "Unable to create wallpaper renderer", error);
                releaseRenderer();
                Canvas canvas = holder.lockCanvas();
                if (canvas != null) { canvas.drawColor(Color.BLACK); holder.unlockCanvasAndPost(canvas); }
            }
        }
        @Override public void onVisibilityChanged(boolean isVisible) {
            visible = isVisible;
            if (clock != null) clock.setSuspended(!isVisible);
        }
        @Override public void onSurfaceDestroyed(SurfaceHolder holder) { releaseRenderer(); super.onSurfaceDestroyed(holder); }
        @Override public void onDestroy() { releaseRenderer(); super.onDestroy(); }
        private void releaseRenderer() {
            if (clock != null) {
                if (clock.getParent() instanceof ViewGroup) ((ViewGroup) clock.getParent()).removeView(clock);
                clock.close(); clock = null;
            }
            if (presentation != null) { presentation.dismiss(); presentation = null; }
            if (display != null) { display.release(); display = null; }
        }
    }
}
