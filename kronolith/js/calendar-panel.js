function sbarToggle(){var A=$(document.body),B;if(A.hasClassName("rightPanel")){B=0;A.removeClassName("rightPanel")}else{B=1;A.addClassName("rightPanel")}new Ajax.Request(KronolithVar.pref_api_url,{parameters:{app:"kronolith",pref:"show_panel",value:B}})}function removeTag(A){}document.observe("dom:loaded",function(){$$("#pageControlsInner .checkbox").invoke("observe","click",function(){Views.invalidate();ShowView(kronolithView,{date:kronolithDate.getFullYear()+(kronolithDate.getMonth()+1).toPaddedString(2)+kronolithDate.getDate().toPaddedString(2),toggle_calendar:this.value},false)});$$("#pageControlsInner .calendar-info").invoke("observe","click",function(){RedBox.loading();var A=this.up().select(".checkbox").first().value;new Ajax.Request(KronolithVar.calendar_info_url,{parameters:{c:A},method:"get",onSuccess:function(B){RedBox.showHtml('<div id="RB_info">'+B.responseText+'<input type="button" class="button" onclick="RedBox.close();" value="'+KronolithText.close+'" /></div>')},onFailure:function(B){RedBox.close()}})})});