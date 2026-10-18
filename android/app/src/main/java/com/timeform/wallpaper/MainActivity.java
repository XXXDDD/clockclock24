package com.timeform.wallpaper;

import android.app.Activity;
import android.app.WallpaperManager;
import android.content.ComponentName;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.widget.FrameLayout;
import android.widget.GridLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

/** Fullscreen live canvas with an icon-only toolbar and two visual sheets. */
public final class MainActivity extends Activity {
    private ClockWebView preview;
    private FrameLayout root, sheet;
    private LinearLayout toolbar;
    private IconView stylesIcon, colorsIcon, applyIcon;
    private SharedPreferences settings;
    private final List<JSONObject> editions = new ArrayList<>();
    private final List<IconView> colorTargets = new ArrayList<>();
    private ColorPickerView picker;
    private String panel = "", colorKey = "board";
    private long previewStartedAt;
    private int bottomInset;
    private android.window.OnBackInvokedCallback backCallback;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state); settings = ClockSettings.preferences(this);
        root = new FrameLayout(this); root.setBackgroundColor(Color.BLACK); setContentView(root);
        preview = new ClockWebView(this); root.addView(preview,new FrameLayout.LayoutParams(-1,-1));
        preview.setOnTouchListener((view,event) -> {
            if(event.getAction()==android.view.MotionEvent.ACTION_UP) view.performClick();
            return true;
        });
        preview.setOnClickListener(view -> { if(!panel.isEmpty())closePanel(); });
        sheet = new FrameLayout(this); sheet.setBackground(surface()); sheet.setElevation(dp(12)); sheet.setVisibility(View.GONE); root.addView(sheet);
        toolbar = new LinearLayout(this); toolbar.setGravity(Gravity.CENTER); toolbar.setPadding(dp(10),dp(4),dp(10),dp(4));
        toolbar.setBackground(surface()); toolbar.setElevation(dp(8));
        stylesIcon = icon("grid","选择时钟款式"); colorsIcon = icon("palette","设置颜色"); applyIcon = icon("apply","设为动态壁纸");
        toolbar.addView(stylesIcon,new LinearLayout.LayoutParams(dp(60),dp(52)));
        toolbar.addView(colorsIcon,new LinearLayout.LayoutParams(dp(60),dp(52)));
        toolbar.addView(applyIcon,new LinearLayout.LayoutParams(dp(60),dp(52)));
        root.addView(toolbar);
        stylesIcon.setOnClickListener(view -> { if("styles".equals(panel)) closePanel(); else showStyles(); });
        colorsIcon.setOnClickListener(view -> { if("colors".equals(panel)) closePanel(); else showColors(); });
        applyIcon.setOnClickListener(view -> { closePanel(); openWallpaperPreview(); });
        if(isXiaomi()) {
            IconView permission = icon("shield","动态壁纸权限"); permission.setBackground(surface()); permission.setElevation(dp(5));
            FrameLayout.LayoutParams position = new FrameLayout.LayoutParams(dp(44),dp(44),Gravity.TOP|Gravity.END);
            position.topMargin=dp(16); position.setMarginEnd(dp(16)); root.addView(permission,position);
            permission.setOnClickListener(view -> openPermissionSettings());
        }
        root.setOnApplyWindowInsetsListener((view,insets) -> {
            bottomInset = insets.getSystemWindowInsetBottom(); layoutPanels(); return insets;
        });
        layoutPanels(); root.requestApplyInsets(); immersive();
        if(android.os.Build.VERSION.SDK_INT>=33) {
            backCallback=() -> { if(!panel.isEmpty())closePanel(); else finish(); };
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,backCallback);
        }
        JSONArray all = ClockSettings.catalog(this);
        for(String type : new String[]{"portrait","circular","landscape"}) for(int i=0;i<all.length();i++) {
            JSONObject entry=all.optJSONObject(i); if(type.equals(entry.optString("category"))) editions.add(entry);
        }
    }

    private void layoutPanels() {
        FrameLayout.LayoutParams bar = new FrameLayout.LayoutParams(-2,dp(60),Gravity.BOTTOM|Gravity.CENTER_HORIZONTAL);
        bar.bottomMargin=bottomInset+dp(18); toolbar.setLayoutParams(bar);
        FrameLayout.LayoutParams panelPosition = new FrameLayout.LayoutParams(-1,dp("styles".equals(panel)?340:330),Gravity.BOTTOM);
        panelPosition.leftMargin=dp(16); panelPosition.rightMargin=dp(16); panelPosition.bottomMargin=bar.bottomMargin+dp(72);
        sheet.setLayoutParams(panelPosition);
    }
    private void openPanel(String name) {
        panel=name; sheet.removeAllViews(); sheet.setVisibility(View.VISIBLE);
        stylesIcon.setSelected("styles".equals(name)); colorsIcon.setSelected("colors".equals(name)); layoutPanels();
    }
    private void closePanel() { panel=""; sheet.setVisibility(View.GONE); stylesIcon.setSelected(false); colorsIcon.setSelected(false); }
    private void showStyles() {
        openPanel("styles"); ScrollView scroll = new ScrollView(this); scroll.setFillViewport(true);
        scroll.setPadding(dp(10),dp(10),dp(10),dp(10)); scroll.setClipToPadding(false);
        GridLayout grid = new GridLayout(this); grid.setColumnCount(3); scroll.addView(grid); sheet.addView(scroll,new FrameLayout.LayoutParams(-1,-1));
        int selected=0;
        for(int index=0;index<editions.size();index++) {
            JSONObject entry = editions.get(index); ClockThumbnailView tile = new ClockThumbnailView(this,entry);
            boolean active=entry.optString("id").equals(ClockSettings.edition(this)); tile.setSelected(active); if(active)selected=index;
            GridLayout.LayoutParams cell=new GridLayout.LayoutParams(); cell.width=0; cell.height=dp(94); cell.columnSpec=GridLayout.spec(GridLayout.UNDEFINED,1f); grid.addView(tile,cell);
            tile.setOnClickListener(view -> {
                settings.edit().putString("edition",entry.optString("id")).apply();
                for(int i=0;i<grid.getChildCount();i++) grid.getChildAt(i).setSelected(grid.getChildAt(i)==view);
                closePanel();
            });
        }
        final int row=selected/3; scroll.post(() -> scroll.scrollTo(0,Math.max(0,dp(row*94-94))));
    }
    private void showColors() {
        openPanel("colors"); LinearLayout content = new LinearLayout(this); content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(10),dp(8),dp(10),dp(6)); sheet.addView(content,new FrameLayout.LayoutParams(-1,-1));
        LinearLayout targets = new LinearLayout(this); targets.setGravity(Gravity.CENTER); content.addView(targets,new LinearLayout.LayoutParams(-1,dp(48)));
        colorTargets.clear();
        String[] keys={"board","long","short"}, descriptions={"板面颜色","长针颜色","短针颜色"};
        for(int i=0;i<keys.length;i++) {
            final String key=keys[i]; IconView target=icon(key,descriptions[i]); target.color(ClockSettings.color(this,key)); target.setSelected(colorKey.equals(key));
            targets.addView(target,new LinearLayout.LayoutParams(dp(52),dp(48))); colorTargets.add(target);
            target.setOnClickListener(view -> { colorKey=key; updateColorControls(); });
        }
        IconView reset=icon("reset","恢复本款原作配色"); targets.addView(reset,new LinearLayout.LayoutParams(dp(52),dp(48)));
        reset.setOnClickListener(view -> {
            SharedPreferences.Editor edit=settings.edit(); for(String key:keys) edit.remove(ClockSettings.edition(this)+"."+key); edit.apply(); updateColorControls();
        });
        GridLayout swatches=new GridLayout(this); swatches.setColumnCount(8); content.addView(swatches,new LinearLayout.LayoutParams(-1,dp(76)));
        for(String hex:new String[]{"#111213","#303333","#6b706b","#a8aaa3","#d6d8d7","#f6f4ef","#e8d4b0","#b48b58",
                "#6d3340","#a95441","#e5aa86","#3d493f","#21444c","#17364d","#393746","#b9bad0"}) {
            int color=Color.parseColor(hex); View swatch=new View(this); swatch.setContentDescription("颜色 "+hex); swatch.setClickable(true); swatch.setFocusable(true);
            GradientDrawable background=new GradientDrawable(); background.setColor(color); background.setShape(GradientDrawable.OVAL); background.setStroke(dp(1),0x22000000); swatch.setBackground(background);
            GridLayout.LayoutParams cell=new GridLayout.LayoutParams(); cell.width=0; cell.height=dp(28); cell.columnSpec=GridLayout.spec(GridLayout.UNDEFINED,1f); cell.setMargins(dp(5),dp(5),dp(5),dp(5)); swatches.addView(swatch,cell);
            swatch.setOnClickListener(view -> { ClockSettings.color(this,colorKey,color); updateColorControls(); });
        }
        picker=new ColorPickerView(this,ClockSettings.color(this,colorKey),color -> { ClockSettings.color(this,colorKey,color); updateTargetColors(); });
        content.addView(picker,new LinearLayout.LayoutParams(-1,0,1));
    }
    private void updateTargetColors() {
        for(IconView target:colorTargets) { target.color(ClockSettings.color(this,target.icon)); target.setSelected(colorKey.equals(target.icon)); }
    }
    private void updateColorControls() { updateTargetColors(); if(picker!=null)picker.color(ClockSettings.color(this,colorKey)); }
    private IconView icon(String icon,String description) { return new IconView(this,icon,description); }
    private GradientDrawable surface() { GradientDrawable result=new GradientDrawable(); result.setColor(0xf5ffffff); result.setCornerRadius(dp(20)); return result; }

    private void openWallpaperPreview() {
        Intent intent=new Intent(WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER);
        intent.putExtra(WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT,new ComponentName(this,ClockWallpaperService.class));
        previewStartedAt=android.os.SystemClock.elapsedRealtime();
        try { startActivityForResult(intent,42); }
        catch(android.content.ActivityNotFoundException error) {
            try { startActivityForResult(new Intent(WallpaperManager.ACTION_LIVE_WALLPAPER_CHOOSER),42); }
            catch(android.content.ActivityNotFoundException unavailable) { startActivity(new Intent(Intent.ACTION_SET_WALLPAPER)); }
        }
    }
    private boolean isXiaomi() {
        return "Xiaomi".equalsIgnoreCase(android.os.Build.MANUFACTURER)||"Redmi".equalsIgnoreCase(android.os.Build.BRAND)||"POCO".equalsIgnoreCase(android.os.Build.BRAND);
    }
    private void openPermissionSettings() {
        try { startActivity(new Intent("miui.intent.action.APP_PERM_EDITOR").setPackage("com.miui.securitycenter").putExtra("extra_pkgname",getPackageName())); }
        catch(android.content.ActivityNotFoundException error) { startActivity(new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS,android.net.Uri.parse("package:"+getPackageName()))); }
    }
    @Override protected void onActivityResult(int request,int result,Intent data) {
        super.onActivityResult(request,result,data);
        if(request==42&&result==RESULT_CANCELED&&isXiaomi()&&android.os.SystemClock.elapsedRealtime()-previewStartedAt<1500)openPermissionSettings();
    }
    private void immersive() {
        if(android.os.Build.VERSION.SDK_INT>=30) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController controller=getWindow().getInsetsController();
            if(controller!=null) { controller.hide(WindowInsets.Type.statusBars()|WindowInsets.Type.navigationBars()); controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE); }
        } else root.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
    }
    private int dp(float value) { return Math.round(value*getResources().getDisplayMetrics().density); }
    @Override public void onWindowFocusChanged(boolean focused) { super.onWindowFocusChanged(focused); if(focused)immersive(); }
    @Override public boolean onKeyUp(int key,android.view.KeyEvent event) {
        if(android.os.Build.VERSION.SDK_INT<33 && key==android.view.KeyEvent.KEYCODE_BACK && !panel.isEmpty()) { closePanel(); return true; }
        return super.onKeyUp(key,event);
    }
    @Override protected void onResume() { super.onResume(); if(preview!=null)preview.setSuspended(false); immersive(); }
    @Override protected void onPause() { if(preview!=null)preview.setSuspended(true); super.onPause(); }
    @Override protected void onDestroy() {
        if(android.os.Build.VERSION.SDK_INT>=33 && backCallback!=null)getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(backCallback);
        if(preview!=null) { ((ViewGroup)preview.getParent()).removeView(preview); preview.close(); preview=null; } super.onDestroy();
    }
}
