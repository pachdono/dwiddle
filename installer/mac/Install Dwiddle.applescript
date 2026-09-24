-- The small Mac installer. It runs install.sh in the background and shows
-- its progress, then opens Dwiddle once it is in Applications.

on run
	set statusFile to do shell script "mktemp /tmp/dwiddle-status.XXXXXX"
	set worker to POSIX path of (path to resource "install.sh")
	set workerPid to do shell script "/bin/bash " & quoted form of worker & " " & quoted form of statusFile & " >/dev/null 2>&1 & echo $!"

	set progress description to "Installing Dwiddle"
	set progress additional description to "Finding the newest version"
	set progress total steps to 100
	set progress completed steps to 0

	try
		my follow(statusFile)
	on error number -128
		-- Stop was pressed: the download is stopped too, not left running.
		do shell script "pkill -P " & workerPid & "; kill " & workerPid & "; rm -f " & quoted form of statusFile & " || true"
	end try
end run

on follow(statusFile)
	repeat
		delay 0.3
		set line_ to ""
		try
			set line_ to do shell script "cat " & quoted form of statusFile
		end try
		set AppleScript's text item delimiters to "|"
		set parts to text items of line_
		set AppleScript's text item delimiters to ""
		if (count of parts) is 3 then
			set stage to item 1 of parts
			set message to item 3 of parts
			if stage is "error" then
				do shell script "rm -f " & quoted form of statusFile
				display dialog message buttons {"OK"} default button 1 with title "Dwiddle" with icon caution
				return
			else if stage is "done" then
				set progress completed steps to 100
				set progress additional description to "Opening Dwiddle"
				do shell script "rm -f " & quoted form of statusFile
				do shell script "open " & quoted form of message
				return
			else
				try
					set progress completed steps to (item 2 of parts) as integer
				end try
				set progress additional description to message
			end if
		end if
	end repeat
end follow
