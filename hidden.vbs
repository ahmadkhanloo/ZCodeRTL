' Runs the injector completely hidden (no console window, no taskbar entry).
If WScript.Arguments.Count < 1 Then WScript.Quit 1
CreateObject("WScript.Shell").Run "node """ & WScript.Arguments(0) & """", 0, False
