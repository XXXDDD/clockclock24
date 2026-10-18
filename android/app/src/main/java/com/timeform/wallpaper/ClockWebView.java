package com.timeform.wallpaper;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.ByteArrayInputStream;
import java.io.IOException;

/** Loads only bundled assets; the application has no network permission. */
final class ClockWebView extends WebView implements SharedPreferences.OnSharedPreferenceChangeListener {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean ready, suspended, disposed;
    private final Runnable refresh = this::sendSettings;

    @SuppressLint("SetJavaScriptEnabled")
    ClockWebView(Context context) {
        super(context);
        setBackgroundColor(Color.BLACK);
        setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);
        WebSettings settings = getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setBlockNetworkLoads(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        setVerticalScrollBarEnabled(false);
        setHorizontalScrollBarEnabled(false);
        setWebChromeClient(new WebChromeClient() {
            @Override public boolean onConsoleMessage(ConsoleMessage message) {
                if (message.messageLevel() == ConsoleMessage.MessageLevel.ERROR)
                    Log.e("TIMEFORM", message.message() + " @" + message.lineNumber());
                return true;
            }
        });
        setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return true; }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String path = uri.getPath();
                if ("https".equals(uri.getScheme()) && "timeform.local".equals(uri.getHost())
                        && ("/index.html".equals(path) || "/timeform.js".equals(path) || "/android.js".equals(path))) {
                    try {
                        return new WebResourceResponse(path.endsWith(".html") ? "text/html" : "application/javascript", "UTF-8",
                            getContext().getAssets().open(path.substring(1)));
                    } catch (IOException error) { Log.e("TIMEFORM", "Missing offline asset", error); }
                }
                return new WebResourceResponse("text/plain", "UTF-8", 404, "Not found", java.util.Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (disposed) return;
                ready = true;
                sendSettings();
                setSuspended(suspended);
            }
        });
        ClockSettings.preferences(context).registerOnSharedPreferenceChangeListener(this);
        loadUrl("https://timeform.local/index.html");
    }

    private void sendSettings() {
        if (ready && !disposed) evaluateJavascript("window.TimeformAndroid&&TimeformAndroid.update(" + ClockSettings.read(getContext()) + ")", null);
    }
    @Override public boolean performClick() { super.performClick(); return true; }
    @Override public void onSharedPreferenceChanged(SharedPreferences prefs, String key) {
        handler.removeCallbacks(refresh);
        handler.postDelayed(refresh, 40);
    }
    void setSuspended(boolean value) {
        suspended = value;
        if (disposed) return;
        if (!value) onResume();
        if (ready) evaluateJavascript("window.TimeformAndroid&&TimeformAndroid.suspend(" + value + ")", null);
        if (value) onPause();
    }
    void close() {
        if (disposed) return;
        disposed = true;
        handler.removeCallbacksAndMessages(null);
        ClockSettings.preferences(getContext()).unregisterOnSharedPreferenceChangeListener(this);
        stopLoading();
        removeAllViews();
        destroy();
    }
}
