interface Props {
  frontmatter: Record<string, unknown>
  filePath: string
}

export function FrontmatterPanel({ frontmatter }: Props) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Metadata
      </h3>
      <div className="space-y-3">
        {Object.entries(frontmatter).map(([key, value]) => (
          <div key={key}>
            <label className="text-xs text-muted-foreground block mb-0.5">{key}</label>
            <div className="text-sm text-foreground">
              {Array.isArray(value) ? (
                <div className="flex flex-wrap gap-1">
                  {value.map((tag, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 bg-muted rounded text-xs text-muted-foreground"
                    >
                      {String(tag)}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-foreground/80">{String(value)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
