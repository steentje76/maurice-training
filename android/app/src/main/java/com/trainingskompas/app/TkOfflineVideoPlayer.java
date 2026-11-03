package com.trainingskompas.app;

import android.app.Activity;
import android.app.Dialog;
import android.graphics.Color;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.view.SurfaceHolder;
import android.view.SurfaceView;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.SeekBar;
import android.widget.TextView;
import android.widget.Toast;

/**
 * App-owned offline player. MediaPlayer reads directly from the AES-GCM
 * MediaDataSource in memory, not a temporary cleartext MP4 or shareable URI.
 */
final class TkOfflineVideoPlayer {
    private TkOfflineVideoPlayer(){}
    static Dialog show(Activity activity,TkMediaVault vault,String owner,TkMediaIntegrity.Entry entry)throws Exception {
        if(Build.VERSION.SDK_INT<23)throw new IllegalStateException("ANDROID_23_REQUIRED");
        final TkMediaDataSource source=new TkMediaDataSource(vault,owner,entry);
        final Dialog dialog=new Dialog(activity,android.R.style.Theme_Black_NoTitleBar_Fullscreen);
        final Handler handler=new Handler(Looper.getMainLooper());
        final MediaPlayer[] active={null};
        LinearLayout view=new LinearLayout(activity);
        view.setOrientation(LinearLayout.VERTICAL);
        view.setBackgroundColor(Color.BLACK);
        final SurfaceView surface=new SurfaceView(activity);
        view.addView(surface,new LinearLayout.LayoutParams(-1,0,1));
        final TextView label=new TextView(activity);
        label.setTextColor(Color.WHITE);
        label.setText("MoveKit · Offline beveiligd");
        label.setPadding(18,12,18,12);
        view.addView(label,new LinearLayout.LayoutParams(-1,-2));
        final SeekBar seek=new SeekBar(activity);
        view.addView(seek,new LinearLayout.LayoutParams(-1,-2));
        LinearLayout actions=new LinearLayout(activity);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        final Button toggle=new Button(activity);
        toggle.setText("Pauze");
        actions.addView(toggle,new LinearLayout.LayoutParams(0,-2,1));
        Button close=new Button(activity);
        close.setText("Sluiten");
        actions.addView(close,new LinearLayout.LayoutParams(0,-2,1));
        view.addView(actions,new LinearLayout.LayoutParams(-1,-2));
        dialog.setContentView(view);
        final Runnable[] update={null};
        update[0]=new Runnable(){
            @Override public void run(){
                MediaPlayer p=active[0];
                if(p!=null){
                    try{if(!seek.isPressed()&&p.isPlaying())seek.setProgress(p.getCurrentPosition());}
                    catch(Exception ignore){}
                    handler.postDelayed(this,500);
                }
            }
        };
        surface.getHolder().addCallback(new SurfaceHolder.Callback(){
            @Override public void surfaceCreated(SurfaceHolder h){
                if(active[0]!=null)return;
                try{
                    MediaPlayer p=new MediaPlayer();active[0]=p;
                    p.setDataSource(source);
                    p.setDisplay(h);
                    p.setScreenOnWhilePlaying(true);
                    p.setOnPreparedListener(mp->{
                        if(!dialog.isShowing())return;
                        seek.setMax(Math.max(1,mp.getDuration()));
                        mp.start();
                        handler.post(update[0]);
                    });
                    p.setOnErrorListener((mp,what,extra)->{
                        label.setText("Deze offline video kon niet veilig worden afgespeeld.");
                        return true;
                    });
                    p.prepareAsync();
                }catch(Exception e){
                    label.setText("Offline video is niet beschikbaar.");
                    if(active[0]!=null){active[0].release();active[0]=null;}
                }
            }
            @Override public void surfaceChanged(SurfaceHolder holder,int f,int w,int h){}
            @Override public void surfaceDestroyed(SurfaceHolder h){
                if(active[0]!=null){active[0].setDisplay(null);}
            }
        });
        toggle.setOnClickListener(v->{
            MediaPlayer p=active[0];if(p==null)return;
            try{if(p.isPlaying()){p.pause();toggle.setText("Afspelen");}
                else{p.start();toggle.setText("Pauze");}}catch(Exception ignore){}
        });
        seek.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener(){
            @Override public void onStartTrackingTouch(SeekBar sb){}
            @Override public void onStopTrackingTouch(SeekBar sb){
                try{if(active[0]!=null)active[0].seekTo(sb.getProgress());}catch(Exception ignore){}
            }
            @Override public void onProgressChanged(SeekBar sb,int progress,boolean fromUser){}
        });
        close.setOnClickListener(v->dialog.dismiss());
        dialog.setOnDismissListener(d->{
            handler.removeCallbacks(update[0]);
            if(active[0]!=null){
                try{active[0].stop();}catch(Exception ignore){}
                active[0].release();active[0]=null;
            }
            source.close();
        });
        dialog.show();
        Window w=dialog.getWindow();
        if(w!=null){
            w.setFlags(WindowManager.LayoutParams.FLAG_SECURE,WindowManager.LayoutParams.FLAG_SECURE);
            w.setLayout(-1,-1);
        }
        return dialog;
    }
}
