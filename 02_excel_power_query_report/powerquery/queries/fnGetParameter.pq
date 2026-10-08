let
    Fn = (key as text, optional defaultValue as any) as any =>
        let
            Config = Excel.CurrentWorkbook(){[Name="config_parameters"]}[Content],
            Matched = Table.SelectRows(Config, each Text.Trim([Parameter]) = Text.Trim(key)),
            Value = if Table.IsEmpty(Matched) then defaultValue else Matched{0}[Value]
        in
            Value
in
    Fn