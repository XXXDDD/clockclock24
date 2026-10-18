package com.timeform.wallpaper;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONObject;
import org.json.JSONArray;
import android.graphics.Color;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;

final class ClockSettings {
    private static JSONArray catalog;
    static JSONArray catalog(Context context) {
        if (catalog == null) try (InputStream input = context.getAssets().open("editions.json")) {
            ByteArrayOutputStream data = new ByteArrayOutputStream(); byte[] bytes = new byte[4096]; int count;
            while ((count = input.read(bytes)) != -1) data.write(bytes, 0, count);
            catalog = new JSONArray(data.toString("UTF-8"));
        } catch (Exception error) { throw new IllegalStateException("Missing offline catalog", error); }
        return catalog;
    }
    static String edition(Context context) { return preferences(context).getString("edition", "amt72v-black"); }
    static JSONObject entry(Context context, String id) {
        JSONArray entries = catalog(context);
        for (int i = 0; i < entries.length(); i++) {
            JSONObject entry = entries.optJSONObject(i);
            if (id.equals(entry.optString("id"))) return entry;
        }
        throw new IllegalArgumentException("Unknown clock edition");
    }
    static int color(Context context, String key) {
        String id = edition(context);
        return Color.parseColor(preferences(context).getString(id + "." + key, entry(context, id).optJSONObject("colors").optString(key)));
    }
    static void color(Context context, String key, int color) {
        preferences(context).edit().putString(edition(context) + "." + key,
            String.format(java.util.Locale.ROOT, "#%06x", color & 0xffffff)).apply();
    }
    static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences("timeform", Context.MODE_PRIVATE);
    }
    static JSONObject read(Context context) {
        SharedPreferences p = preferences(context);
        JSONObject result = new JSONObject();
        try {
            result.put("edition", edition(context));
            for (String key : new String[]{"board", "long", "short"})
                result.put(key, String.format(java.util.Locale.ROOT, "#%06x", color(context, key) & 0xffffff));
            android.os.PowerManager power = (android.os.PowerManager) context.getSystemService(Context.POWER_SERVICE);
            result.put("fps", power != null && power.isPowerSaveMode() ? 15 : 30);
        } catch (org.json.JSONException error) { throw new IllegalStateException(error); }
        return result;
    }
}
