-- La cara del instalador de macOS: lo único que ve el alumno.
--
-- Se compila con osacompile y queda una app de las de Apple, con su ventana de
-- progreso y sus diálogos nativos. El trabajo lo hace instalar.js, que va
-- escribiendo por dónde va en un fichero; aquí solo se lee y se enseña.
--
-- Por qué una app y no el .pkg de Apple: el .pkg que instala en la carpeta del
-- alumno dispara en macOS 26 un aviso de privacidad del propio Instalador
-- ("quiere acceder a datos de otras apps") nada más pasar la portada, y el que
-- instala fuera pide contraseña de administrador. Con nuestra app no hay ni una
-- cosa ni la otra, y encima las frases son nuestras.
--
-- Todo lo que se ve aquí sale de docs/diccionario.md.

property TOTAL : 6

on run
	set recursos to (POSIX path of (path to me)) & "Contents/Resources/"
	-- Ya no se llama a Node directamente: puede no estar. arrancar.sh es `sh`,
	-- que macOS trae siempre, y es quien consigue un Node antes de seguir.
	set elArranque to recursos & "arrancar.sh"

	try
		display dialog "Voy a dejar tu espacio de trabajo listo en este Mac.

Tarda unos minutos, hace falta internet y no te voy a pedir ninguna contraseña." with title "Executive Lab" buttons {"Ahora no", "Empezar"} default button "Empezar" with icon note
		if button returned of result is "Ahora no" then return

		-- Con qué asistente (decisión 168), la misma pregunta y las mismas
		-- palabras que el instalador de Windows. Claude por defecto.
		display dialog "¿Con cuál vas a trabajar?

Los dos hacen lo mismo aquí. Si en clase te han dicho uno, elige ese. Si no lo sabes, deja Claude." with title "Tu asistente" buttons {"Claude", "Codex", "Los dos"} default button "Claude" with icon note
		set elegido to button returned of result
	on error number -128
		return
	end try

	set elAsistente to "claude"
	if elegido is "Codex" then set elAsistente to "codex"
	if elegido is "Los dos" then set elAsistente to "losDos"

	set progreso to do shell script "mktemp /tmp/executive-lab-progreso.XXXXXX"
	set elPid to do shell script "/bin/sh " & quoted form of elArranque & " --progreso " & quoted form of progreso & " --asistente " & elAsistente & " >/dev/null 2>&1 & echo $!"

	set progress total steps to TOTAL
	set progress completed steps to 0
	set progress description to "Empezando"
	set progress additional description to ""

	set acabado to false
	set bien to false
	set recado to ""

	repeat until acabado
		delay 0.4
		set loLeido to leerLoUltimo(progreso)
		set acabado to (clase of loLeido is "FIN")
		if acabado then
			set bien to (dato of loLeido is "ok")
			set recado to recadoDe(loLeido)
		else
			if clase of loLeido is "PASO" then
				set progress completed steps to (dato of loLeido) as integer
				set progress description to recadoDe(loLeido)
				set progress additional description to ""
			else if clase of loLeido is "DETALLE" then
				set progress additional description to (dato of loLeido)
			end if

			-- Si el trabajo se ha parado sin decir nada, se vuelve a mirar el
			-- fichero antes de darlo por muerto: puede haber acabado justo
			-- entre la lectura de arriba y esta comprobación.
			if (do shell script "kill -0 " & elPid & " >/dev/null 2>&1 && echo si || echo no") is "no" then
				set loLeido to leerLoUltimo(progreso)
				set acabado to true
				set bien to (clase of loLeido is "FIN" and dato of loLeido is "ok")
				if clase of loLeido is "FIN" then
					set recado to recadoDe(loLeido)
				else
					set recado to "se ha parado a mitad"
				end if
			end if
		end if
	end repeat

	set progress completed steps to TOTAL

	if bien then
		display dialog "Ya está. Te lo abro." with title "Executive Lab" buttons {"Abrir"} default button "Abrir" with icon note
		do shell script "/usr/bin/open " & quoted form of recado
	else
		set informe to (POSIX path of (path to desktop)) & "Informe para tu tutor.txt"
		try
			do shell script "cp /tmp/executive-lab-instalacion.log " & quoted form of informe
		end try
		display dialog "No he podido terminar.

Te he dejado en el escritorio un informe para tu tutor." with title "Executive Lab" buttons {"Ver el informe", "Cerrar"} default button "Ver el informe" with icon caution
		if button returned of result is "Ver el informe" then
			do shell script "/usr/bin/open -R " & quoted form of informe
		end if
	end if
end run

-- La última línea del fichero de progreso, ya troceada. Cada línea es
-- CLASE, un dato y un texto, separados por tabuladores.
on leerLoUltimo(fichero)
	set laLinea to do shell script "tail -n 1 " & quoted form of fichero & " 2>/dev/null || true"
	if laLinea is "" then return {clase:"", dato:"", resto:{}}

	set antes to AppleScript's text item delimiters
	set AppleScript's text item delimiters to (character id 9)
	set trozos to text items of laLinea
	set AppleScript's text item delimiters to antes

	if (count of trozos) is 1 then return {clase:item 1 of trozos, dato:"", resto:{}}
	-- Un DETALLE trae solo dos trozos: «items 3 thru -1» de una lista de dos revienta (-1728).
	if (count of trozos) is 2 then return {clase:item 1 of trozos, dato:item 2 of trozos, resto:{}}
	return {clase:item 1 of trozos, dato:item 2 of trozos, resto:items 3 thru -1 of trozos}
end leerLoUltimo

-- El texto de una línea: lo que va después del dato. En un PASO son el total y
-- la frase; en un FIN, el recado.
on recadoDe(loLeido)
	set elResto to resto of loLeido
	if (count of elResto) is 0 then return ""
	return item -1 of elResto
end recadoDe
